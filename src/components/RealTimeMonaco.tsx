// From https://github.com/shauryag2002/real-time-monaco/blob/2a559ce1d69f9649053fd50b58b275139257a398/src/components/RealTimeMonaco/RealTimeMonaco.tsx
import { useCallback, useEffect, useRef, FunctionComponent } from "react";
import MonacoEditor, { EditorProps as MonacoEditorProps } from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { editor } from "monaco-editor";
import * as monaco from "monaco-editor";
import React from "react";

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

// Simplified version that relies on y-monaco's default cursor handling
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

      // Initialize Yjs
      const doc = new Y.Doc();
      const provider = new WebsocketProvider(WebsocketURL, roomId, doc);
      const type = doc.getText("monaco");

      // Save refs for cleanup
      docRef.current = doc;
      providerRef.current = provider;

      // Set user info in awareness
      provider.awareness.setLocalStateField("user", {
        name,
        color,
      });

      // Create Monaco binding with awareness
      const model = ed.getModel();
      if (model) {
        bindingRef.current = new MonacoBinding(
          type,
          model,
          new Set([ed]),
          provider.awareness // important for cursor sharing
        );
      }

      // Call the original onMount if provided
      if (onMount) onMount(ed, monaco);
    },
    [WebsocketURL, roomId, name, color, onMount]
  );

  // Keep awareness user info in sync if name/color props change
  useEffect(() => {
    const provider = providerRef.current;
    if (provider) {
      provider.awareness.setLocalStateField("user", { name, color });
    }
  }, [name, color]);

  // Destroy provider/doc on unmount to avoid ghost cursors
  useEffect(() => {
    return () => {
      const provider = providerRef.current;
      const doc = docRef.current;

      if (provider) {
        try {
          // Tell others we left so presence disappears immediately
          provider.awareness.setLocalState(null);
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