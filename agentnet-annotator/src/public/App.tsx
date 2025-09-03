import * as React from "react";
import { CssVarsProvider } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";

import Sidebar from "../components/Sidebar";
import {
  Outlet,
  useLoaderData,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { MainProvider, useMain } from "../context/MainContext";
import TermsAndConsent from "../components/prerequisite/Terms";
import Check from "../components/prerequisite/Check";

interface taskProp {
  name: string;
  creation_time: string;
  task_name: string;
  recording_status: Record<string, any>;
}

interface localRecordingProp {
  name: string;
  creation_time: string;
  task_name: string;
  recording_status: Record<string, any>;
  visualizable: boolean;
  status: string;
}

interface onlineRecordingProp {
  allocated_timestamp: string | null;
  upload_timestamp: string | null;
  verify_feedback: Record<string, any> | null;
  task_name: string | null;
  task_description: string | null;
  recording_id: string | null;
  downloaded: boolean;
  visualizable: boolean;
  status: string | null;
}

interface tasksGroupProp {
  uploaded_recordings: localRecordingProp[];
  not_uploaded_recordings: onlineRecordingProp[];
}

const loadTasks = async () => {
  try {
    const res = await fetch("http://127.0.0.1:5328/api/recordings");
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const resjson = await res.json();
    // The API returns data directly, not nested under 'tasks'
    const tasks: tasksGroupProp = {
      uploaded_recordings: resjson.uploaded_recordings || [],
      not_uploaded_recordings: resjson.not_uploaded_recordings || []
    };
    console.log("Loaded tasks:", tasks);
    return { tasks };
  } catch (error) {
    console.error("Failed to load tasks:", error);
    // Return empty task structure as fallback
    const fallbackTasks: tasksGroupProp = {
      uploaded_recordings: [],
      not_uploaded_recordings: []
    };
    console.log("Using fallback tasks:", fallbackTasks);
    return { tasks: fallbackTasks };
  }
};

export default function App() {
  const [tasks, setTasks] = React.useState<tasksGroupProp>({
    uploaded_recordings: [],
    not_uploaded_recordings: []
  });
  const { openModal, setOpenModal } = useMain();
  const location = useLocation(); // 使用useLocation钩子
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const navigate = useNavigate();

  const [showCheck, setShowCheck] = React.useState(() => {
    return localStorage.getItem("checkCompleted") !== "true";
  });
  const [showTerms, setShowTerms] = React.useState(false);


  React.useEffect(() => {
    console.log(location.pathname);
    const isTasksPath =
      location.pathname.startsWith("/tasks") ||
      location.pathname.startsWith("/reviewtasks");
    console.log(isTasksPath);
    setSidebarOpen(!isTasksPath);
  }, [location]);


  // Removed loadTasks useEffect - Sidebar now uses MainContext exclusively
  // React.useEffect(() => {
  //   loadTasks().then((response) => {
  //     console.log("Setting tasks from loadTasks:", response.tasks);
  //     setTasks(response.tasks);
  //   }).catch((error) => {
  //     console.error("Error in loadTasks:", error);
  //     // Ensure we have a fallback
  //     setTasks({
  //       uploaded_recordings: [],
  //       not_uploaded_recordings: []
  //     });
  //   });
  // }, []);

  const handleCheckComplete = () => {
    localStorage.setItem("checkCompleted", "true");
    setShowCheck(false);
    // 完成 Check 后显示 Terms
    setShowTerms(true);
  };

  const handleTermsAgree = async () => {
    setShowTerms(false);
  };

  const handleTermsDisagree = async () => {
    setShowTerms(false);
    navigate("/");
  };

  // 如果需要显示 Check 或 Terms，不渲染主应用内容
  if (showCheck) {
    return (
      <CssVarsProvider disableTransitionOnChange>
        <CssBaseline />
        {showCheck && (
          <Check
            isOpen={true}
            onClose={() => { }} // 可以根据需要处理关闭逻辑
            onComplete={handleCheckComplete}
          />
        )}

      </CssVarsProvider>
    );
  }

  // 主应用内容
  return (
    <CssVarsProvider disableTransitionOnChange>
      <CssBaseline />
      {showTerms ? (<TermsAndConsent onAgree={handleTermsAgree} onDisagree={handleTermsDisagree} />
      ) : (
        <div className="flex flex-row min-h-full h-full m-0 p-0 w-full max-w-full">
          <Sidebar tasks={tasks} init_open={sidebarOpen} />
          <Outlet />
        </div>
      )}
    </CssVarsProvider>
  );
}
