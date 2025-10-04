import { Box } from "@chakra-ui/react";
import CodeEditor from "./CodeEditor";
import { useNavigate } from "react-router-dom";

const Homepage = () => {
    const navigate = useNavigate();

    const handleGetStarted = () => {
        navigate("/editor");
    }

    return (
        <div className="homepage">
            <h1>Welcome to the Homepage</h1>
            <p>This is the main landing page of the application.</p>
            <button onClick={handleGetStarted}>Get Started</button>
        </div>
    );
}

export default Homepage;