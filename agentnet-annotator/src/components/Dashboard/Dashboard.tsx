import AdminDashboard from "./Admin/AdminDashboard";
import RegDashboard from "./Regular/RegDashboard";
import { useMain } from "../../context/MainContext";

const Dashboard = () => {
    const { userData } = useMain();
    if (!userData || userData.user_type === null) {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh", // Full height of the viewport for vertical centering
                    width: "100vw", // Full width of the viewport for horizontal centering
                    textAlign: "center", // Center the text itself
                    fontSize: "18px", // Optional: Adjust the font size
                }}
            >
                Invalid user type. Please login first.
            </div>
        );
    } else if (userData.user_type === "BANNED") {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh", // Full height of the viewport for vertical centering
                    width: "100vw", // Full width of the viewport for horizontal centering
                    textAlign: "center", // Center the text itself
                    fontSize: "18px", // Optional: Adjust the font size
                }}
            >
                You are banned from AgentNet due to violation of our terms and conditions.
            </div>
        );
    } else if (userData.user_type === "REGULAR") {
        return <RegDashboard />;
    } else if (userData.user_type === "ADMIN") {
        return <AdminDashboard />;
    } else {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh", // Full height of the viewport for vertical centering
                    width: "100vw", // Full width of the viewport for horizontal centering
                    textAlign: "center", // Center the text itself
                    fontSize: "18px", // Optional: Adjust the font size
                }}
            >
                Invalid user type. Please login first.
            </div>
        );
    }
};

export default Dashboard;
