import Homepage from "./components/Homepage";
import CodeEditor from "./components/CodeEditor";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/editor" element={<CodeEditor />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
