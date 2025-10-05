// From https://github.com/shauryag2002/real-time-monaco/blob/2a559ce1d69f9649053fd50b58b275139257a398/src/components/RealTimeMonaco/RealTimeMonaco.tsx
import { useCallback } from "react";
import MonacoEditor from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { editor } from "monaco-editor";
import { useRef } from "react";
import { FunctionComponent } from "react";
import { EditorProps as MonacoEditorProps } from "@monaco-editor/react";
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

  const handleEditorDidMount = useCallback(
    (editor: editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;

      // Initialize Yjs
      const doc = new Y.Doc();
      const provider = new WebsocketProvider(WebsocketURL, roomId, doc);
      const type = doc.getText("monaco");

      // Set user info in awareness
      provider.awareness.setLocalStateField("user", {
        name: name,
        color: color,
      });

      // Create Monaco binding with awareness
      const model = editor.getModel();
      if (model) {
        new MonacoBinding(
          type,
          model,
          new Set([editor]),
          provider.awareness // This is important for cursor sharing!
        );
      }

      // Call the original onMount if provided
      if (onMount) {
        onMount(editor, monaco);
      }
    },
    [WebsocketURL, roomId, name, color, onMount]
  );

  return (
    <MonacoEditor theme="vs-dark" onMount={handleEditorDidMount} {...props} />
  );
};