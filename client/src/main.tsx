import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// App will handle providers internally
createRoot(document.getElementById("root")!).render(<App />);
