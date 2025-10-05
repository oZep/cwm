// Simplified and cleaned up RealTimeMonaco with proper cleanup to avoid ghost cursors
"use client";

import React, { useCallback, useEffect, useRef, FunctionComponent } from "react";
import MonacoEditor, { EditorProps as MonacoEditorProps } from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { editor } from "monaco-editor";
import * as monaco from "monaco-editor";

export interface UsersType {
  cursor: {
    column?: number;
    lineNumber?: number;
  };
  selection: {
    endColumn?: number;
    endLineNumber?: number;
    positionColumn?: number;
    positionLineNumber?: number;
    selectionStartColumn?: number;
    selectionStartLineNumber?: number;
    startColumn?: number;
    startLineNumber?: number;
  };
  user: {
    color?: string;
    name?: string;
  };
}

export const RealTimeMonaco: FunctionComponent<
  MonacoEditorProps & {
    WebsocketURL: string;
    name: string;
    roomId: string;
    color: string;
  }
> = ({ WebsocketURL, roomId, name, color, onMount, ...props }) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor>();
  const providerRef = useRef<WebsocketProvider | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  const handleEditorDidMount = useCallback(
    (ed: editor.IStandaloneCodeEditor) => {
      editorRef.current = ed;

      // Initialize Yjs + WebSocket provider
      const doc = new Y.Doc();
      const provider = new WebsocketProvider(WebsocketURL, roomId, doc);
      const type = doc.getText("monaco");

      docRef.current = doc;
      providerRef.current = provider;

      // Set local user info in awareness
      provider.awareness.setLocalStateField("user", {
        name,
        color,
      });

      // Bind Monaco model <-> Y.Text with awareness for cursors
      const model = ed.getModel();
      if (model) {
        bindingRef.current = new MonacoBinding(
          type,
          model,
          new Set([ed]),
          provider.awareness
        );

        // One-time cleanup in case "undefined" was persisted
        const BAD = "undefined";
        const current = model.getValue();
        if (current && current.endsWith(BAD)) {
          model.setValue(current.slice(0, -BAD.length));
        }
      }

      if (onMount) onMount(ed, monaco);
    },
    [WebsocketURL, roomId, name, color, onMount]
  );

  // Keep awareness user info updated if name/color change
  useEffect(() => {
    const provider = providerRef.current;
    if (provider) {
      provider.awareness.setLocalStateField("user", { name, color });
    }
  }, [name, color]);

  // Cleanup on unmount to prevent ghost cursors
  useEffect(() => {
    return () => {
      const provider = providerRef.current;
      const doc = docRef.current;

      if (provider) {
        try {
          provider.awareness.setLocalState(null); // announce leave
        } catch {}
        try {
          provider.disconnect();
        } catch {}
        try {
          provider.destroy();
        } catch {}
      }
      if (doc) {
        try {
          doc.destroy();
        } catch {}
      }
      providerRef.current = null;
      docRef.current = null;
      bindingRef.current = null;
    };
  }, []);

  return <MonacoEditor theme="vs-dark" onMount={handleEditorDidMount} {...props} />;
};