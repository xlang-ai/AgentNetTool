import * as ReactDOM from "react-dom/client";
import App from "./App";

import { createHashRouter, RouterProvider } from "react-router-dom";
import ErrorPage from "../routes/error-page";
import Page from "../components/Local/page";
import ReviewPage from "../components/Verify/reviewpage";
import Homepage from "../components/Homepage/Homepage";
import "./globals.css";
import { MainProvider } from "../context/MainContext";
import VerifyList from "../components/Dashboard/Regular/RegVerifyList";
import Dashboard from "../components/Dashboard/Dashboard";
import Report from "../components/Report/Report";
import { AdminDashboardProvider } from "../context/AdminDashboardContext";
import DisAgreePage from "../routes/disagree-page";

const router = createHashRouter([
    {
        path: "/",
        element: <App />,
        errorElement: <ErrorPage />,
        children: [
            {
                path: "/tasks/:recording_name",
                element: <Page />,
                loader: async ({ params }) => {
                    const res = await fetch(
                        `http://localhost:5328/api/recording/${params.recording_name}`
                    );
                    if (!res.ok) {
                        throw new Error("Failed to load task");
                    }
                    return {
                        recording_name: params.recording_name,
                        task_data: await res.json(),
                    };
                },
            },
            {
                path: "/reviewtasks/:recording_name",
                element: <ReviewPage />,
                loader: async ({ params }) => {
                    const res = await fetch(
                        `http://localhost:5328/api/recording/${params.recording_name}/1`
                    );
                    if (!res.ok) {
                        throw new Error("Failed to load task");
                    }
                    return {
                        recording_name: params.recording_name,
                        task_data: await res.json(),
                    };
                },
            },
            {
                path: "/",
                index: true,
                element: <Homepage />,
            },
            {
                path: "/dashboard",
                element: <Dashboard />,
            },
            {
                path: "/report",
                element: <Report />,
            },
            {
                path: "/disagree",
                element: <DisAgreePage />,
            },
        ],
    },
]);

ReactDOM.createRoot(document.querySelector("#root")!).render(
    // <React.StrictMode>
    <MainProvider>
        <AdminDashboardProvider>
            <RouterProvider router={router} />
        </AdminDashboardProvider>
    </MainProvider>
    // </React.StrictMode>
    // In development mode, StrictMode causes component lifecycle methods (including the constructor, render method, and useEffect hook) to be invoked twice, and 'start-record' is also listened twice. Therefore, we comment it out.
);
