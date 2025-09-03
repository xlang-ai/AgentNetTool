import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
    useEffect,
    useRef,
} from "react";
import SocketIOService from "../utils/SocketService";
import {
    Snackbar,
    Box,
    CircularProgress,
    Typography,
    Card,
    CardContent,
} from "@mui/joy";
import useSystemTheme from "./SystemTheme";
import { SERVER_URL } from "../public/constant";

interface tutorialProps {
    task_id: string | null;
    status: string | null;
    annotation_count: number;
    task_name: string | null;
    task_description: string | null;
    url: string | null;
    task_source: string;
    category: string;
    platform: string;
    info?: Record<string, any> | null;
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

// "recording_id","upload_timestamp","s3_path","status","uploader_id","verifier_id","task_name","task_description","verify_feedback"

interface adminRecordingProp {
    recording_id: string;
    upload_timestamp: string;
    s3_path: string;
    status: string;
    uploader_id: string;
    verifier_id: string;
    uploader_name: string;
    verifier_name: string;
    task_name: string;
    task_description: string;
    verify_feedback: Record<string, string>;
    downloaded: boolean;
    visualizable: boolean;
    // TODO: add verifier name adn uploader name
}

interface userDataProp {
    user_id: string;
    accepted_uploads: number;
    rejected_uploads: number;
    total_uploads: number;
    total_verify_count: number;
    user_name: string;
    user_type: string;
}

interface userDataTimelineProp {
    total_users?: number;
    total_uploaded_tasks?: number;
    total_accepted_tasks?: number;
    total_rejected_tasks?: number;
    data: any[];
}

interface IdNameProp {
    [id: string]: string;
}

interface FetchOutsideTasksParams {
    taskType: string;
    page_idx?: number;
    status?: string | null;
}

interface FetchAdminTasksParams {
    page_idx?: number; // 可选参数，表示页码
    status?: string; // 可选参数，表示状态
    uploader_id?: string; // 可选参数，表示上传者ID
    verifier_id?: string; // 可选参数，表示审核者ID
}

interface MainContextType {
    isRecording: boolean;
    setIsRecording: (value: boolean) => void;
    openModal: boolean;
    setOpenModal: (value: boolean) => void;
    SocketService: SocketIOService;
    SystemMode: string;
    setSystemMode: (value: string) => void;
    uploadedTasks: localRecordingProp[];
    setUploadedTasks: (value: localRecordingProp[]) => void;
    notUploadedTasks: localRecordingProp[];
    setNotUploadedTasks: (value: localRecordingProp[]) => void;
    fetchTasks: () => Promise<void>;
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
    showInfo: (message: string) => void;
    myos: string;
    setOs: (value: string) => void;
    addNewRecording: (recordingData?: any) => void;
    
    // User-related properties
    username: string | null;
    user_id: string | null;
    userData: userDataProp | null;
    userDataTimeline: userDataTimelineProp | null;
    userDict: Record<string, string>;
    setUserDict: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    
    // Data fetching functions
    fetchStats: (value?: string) => Promise<void>;
    fetchUserData: () => Promise<void>;
    fetchOutsideTasks: (params: FetchOutsideTasksParams) => Promise<void>;
    fetchNewTasksToVerify: () => Promise<void>;
    fetchAdminTasks: (params: FetchAdminTasksParams) => Promise<void>;
    
    // Task management properties
    annotatedTasks: onlineRecordingProp[];
    allVerifyTasks: onlineRecordingProp[];
    setAllVerifyTasks: React.Dispatch<React.SetStateAction<onlineRecordingProp[]>>;
    adminTasks: adminRecordingProp[];
    setAdminTasks: React.Dispatch<React.SetStateAction<adminRecordingProp[]>>;
    hasMore: boolean;
    
    // Task Hub properties
    HubTaskId: string | null;
    setHubTaskId: React.Dispatch<React.SetStateAction<string | null>>;
    HubTaskName: string | null;
    setHubTaskName: React.Dispatch<React.SetStateAction<string | null>>;
    HubTaskDescription: string | null;
    setHubTaskDescription: React.Dispatch<React.SetStateAction<string | null>>;
    suggestions: string[];
    setSuggestions: React.Dispatch<React.SetStateAction<string[]>>;
    tutorials: tutorialProps[] | null;
    setTutorials: React.Dispatch<React.SetStateAction<tutorialProps[] | null>>;
}

const MainContext = createContext<MainContextType | undefined>(undefined);

export const MainProvider: React.FC<{ children: ReactNode }> = ({
    children,
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const SocketService = new SocketIOService();
    const [openModal, setOpenModal] = useState(false);
    const systemTheme = useSystemTheme();
    const [SystemMode, setSystemMode] = useState(systemTheme);
    const [uploadedTasks, setUploadedTasks] = useState<localRecordingProp[]>(
        []
    );
    const [notUploadedTasks, setNotUploadedTasks] = useState<
        localRecordingProp[]
    >([]);
    
    // User-related state
    const [username, setUsername] = useState<string | null>(null);
    const [user_id, setUserId] = useState<string | null>(null);
    const [userData, setUserData] = useState<userDataProp | null>(null);
    const [userDataTimeline, setUserDataTimeline] = useState<userDataTimelineProp | null>(null);
    const [userDict, setUserDict] = useState<Record<string, string>>({});
    
    // Task management state
    const [annotatedTasks, setAnnotatedTasks] = useState<onlineRecordingProp[]>([]);
    const [allVerifyTasks, setAllVerifyTasks] = useState<onlineRecordingProp[]>([]);
    const [adminTasks, setAdminTasks] = useState<adminRecordingProp[]>([]);
    const [hasMore, setHasMore] = useState<boolean>(true);
    
    // Task Hub state
    const [HubTaskId, setHubTaskId] = useState<string | null>(null);
    const [HubTaskName, setHubTaskName] = useState<string | null>(null);
    const [HubTaskDescription, setHubTaskDescription] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [tutorials, setTutorials] = useState<tutorialProps[] | null>(null);

    // Use useRef here to make sure StartRecord&StopRecord takes the new value of username
    const isRecordingRef = useRef(isRecording);

    useEffect(() => {
        isRecordingRef.current = isRecording; // fetch the newest isRecording value
    }, [isRecording]);

    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [severity, setSeverity] = useState("success"); // 'success', 'error', 'warning', 'info'
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [progressMsg, setProgressMsg] = useState("");
    const [os, setOs] = useState("");
    const fetchOS = async () => {
        window.electron.ipcRenderer.on("get_os_system_response", (os: any) => {
            setOs(os);
        });
        try {
            window.electron.ipcRenderer.sendMessage("get_os_system");
        } catch (error) {
            console.error("Failed to fetch OS:", error);
        }
    };
    useEffect(() => {
        SocketService.Listen("reduced", (response) => {
            console.log("reduced");
            setTimeout(() => {
                fetchTasks();
            }, 1500);
        });
        fetchOS();
        
        // Fetch tasks on startup
        fetchTasks();
        
        // Login disabled - set default user data to bypass authentication
        setUsername("Local User");
        setUserId("local-user");
        setUserData({
            user_id: "local-user",
            user_name: "Local User",
            user_type: "REGULAR",
            accepted_uploads: 0,
            rejected_uploads: 0,
            total_uploads: 0,
            total_verify_count: 0
        });
    }, []);

    const showSuccess = (msg: string) => {
        setMessage(msg);
        setSeverity("success");
        setOpenSnackbar(true);
        setTimeout(() => {
            setOpenSnackbar(false);
        }, 3000);
    };

    const showError = (msg: string) => {
        setMessage(msg);
        setSeverity("error");
        setOpenSnackbar(true);
        setTimeout(() => {
            setOpenSnackbar(false);
        }, 3000);
    };

    const showInfo = (msg: string) => {
        setMessage(msg);
        setSeverity("neutral");
        setOpenSnackbar(true);
        setTimeout(() => {
            setOpenSnackbar(false);
        }, 3000);
    };




    const startProgress = (msg: string) => {
        setLoading(true);
        setProgressMsg(msg);
    };

    const stopProgress = () => {
        setLoading(false);
    };


    const fetchTasks = async () => {
        try {
            const response = await fetch(
                "http://127.0.0.1:5328/api/recordings"
            );
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const all_tasks = await response.json();
            console.log("All Tasks:", all_tasks);
            setUploadedTasks(all_tasks["uploaded_recordings"] || []);
            setNotUploadedTasks(all_tasks["not_uploaded_recordings"] || []);
            console.log("uploadedTasks:", all_tasks["uploaded_recordings"]);
            console.log("notUploadedTasks:", all_tasks["not_uploaded_recordings"]);
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
            console.log("Using fallback: setting empty task lists");
            // Fallback: set empty arrays when API fails
            setUploadedTasks([]);
            setNotUploadedTasks([]);
            showInfo("Backend service not available. Recording files will appear after recording is complete.");
        }
    };

    // Function to add a new recording manually (fallback when API fails)
    const addNewRecording = (recordingData?: any) => {
        const now = new Date();
        const timestamp = now.toISOString();
        const recordingId = `recording_${now.getTime()}`;
        
        const newRecording = {
            name: recordingId,
            creation_time: timestamp,
            task_name: HubTaskName || "New Recording",
            recording_status: { status: "completed" },
            visualizable: true,
            status: "completed"
        };
        
        console.log("Adding new recording manually:", newRecording);
        setNotUploadedTasks(prev => [newRecording, ...prev]);
        showSuccess("Recording saved successfully!");
    };

    // Data fetching functions
    const fetchStats = async (value?: string) => {
        try {
            const response = await fetch(`${SERVER_URL}/get_overview`);
            const data = await response.json();
            console.log("Stats fetched:", data);
        } catch (error) {
            console.error("Failed to fetch stats:", error);
        }
    };

    const fetchUserData = async () => {
        try {
            if (!user_id) return;
            const response = await fetch(`${SERVER_URL}/get_user_data/${user_id}`);
            const data = await response.json();
            setUserData(data);
            console.log("User data fetched:", data);
        } catch (error) {
            console.error("Failed to fetch user data:", error);
        }
    };

    const fetchOutsideTasks = async (params: FetchOutsideTasksParams) => {
        try {
            const queryParams = new URLSearchParams();
            if (params.page_idx !== undefined) queryParams.append('page_idx', params.page_idx.toString());
            if (params.status) queryParams.append('status', params.status);
            
            const response = await fetch(`${SERVER_URL}/get_outside_tasks/${params.taskType}?${queryParams}`);
            const data = await response.json();
            
            if (params.taskType === 'annotate') {
                setAnnotatedTasks(data);
            } else if (params.taskType === 'verify') {
                setAllVerifyTasks(data);
            }
        } catch (error) {
            console.error("Failed to fetch outside tasks:", error);
        }
    };

    const fetchNewTasksToVerify = async () => {
        try {
            const response = await fetch(`${SERVER_URL}/get_new_tasks_to_verify`);
            const data = await response.json();
            setAllVerifyTasks(data);
        } catch (error) {
            console.error("Failed to fetch new tasks to verify:", error);
        }
    };

    const fetchAdminTasks = async (params: FetchAdminTasksParams) => {
        try {
            const queryParams = new URLSearchParams();
            if (params.page_idx !== undefined) queryParams.append('page_idx', params.page_idx.toString());
            if (params.status) queryParams.append('status', params.status);
            if (params.uploader_id) queryParams.append('uploader_id', params.uploader_id);
            if (params.verifier_id) queryParams.append('verifier_id', params.verifier_id);
            
            const response = await fetch(`${SERVER_URL}/get_admin_tasks?${queryParams}`);
            const data = await response.json();
            setAdminTasks(data);
        } catch (error) {
            console.error("Failed to fetch admin tasks:", error);
        }
    };


    // TODO: modify the code below, get 5 recordings to verify







    useEffect(() => {
        console.log("systemTheme:", systemTheme);
        setSystemMode(systemTheme);
    }, [systemTheme]);

    // useEffect(() => {
    //     fetchNewTasksToVerify();
    // }, [user_id]);

    const StartRecord = () => {
        if (isRecordingRef.current) {
            window.electron.ipcRenderer.sendMessage("maximize-window");
            showError("You haven't stopped a recording yet");
        } else {
            console.log("Start Recording by Shortcut");
            window.electron.ipcRenderer.sendMessage("start-record-icon");
            SocketService.Get("start_record")
                .then((data) => {
                    console.log("Operation succeeded:", data);
                    window.electron.ipcRenderer.sendMessage("maximize-window");
                    showSuccess(data.message);
                    setIsRecording(true);
                    setLoading(true);
                    setTimeout(() => {
                        window.electron.ipcRenderer.sendMessage(
                            "minimize-window"
                        );
                    }, 2000);
                })
                .catch((error) => {
                    console.error("Operation failed:", error.message);
                    window.electron.ipcRenderer.sendMessage("maximize-window");
                    showError(error.message);
                    setTimeout(() => {
                        window.location.reload();
                    }, 5000);
                });
        }
    };
    const StopRecord = () => {
        if (!isRecordingRef.current) {
            window.electron.ipcRenderer.sendMessage("maximize-window");
            showError("You haven't started a recording yet");
        } else {
            console.log("Stop Recording by Shortcut");
            window.electron.ipcRenderer.sendMessage("stop-record-icon");
            SocketService.Get("stop_record")
                .then(async (data) => {
                    console.log("Operation succeeded:", data);
                    setIsRecording(false);
                    setLoading(false);
                    window.electron.ipcRenderer.sendMessage("maximize-window");

                    await fetchTasks();
                })
                .catch((error) => {
                    console.error("Operation failed:", error.message);
                    showError(error.message);
                    setTimeout(() => {
                        window.location.reload();
                    }, 5000);
                });
        }
    };

    const GetAXTree = () => {
        if (!isRecordingRef.current) {
            showError("You can't get AXTree when there is no recording");
        } else {
            console.log("Get AXTree by Shortcut");
            window.electron.ipcRenderer.sendMessage("show-notification-start");
            SocketService.Get("get_axtree")
                .then((data) => {
                    console.log("Operation succeeded:", data);
                    window.electron.ipcRenderer.sendMessage(
                        "show-notification-end"
                    );
                })
                .catch((error) => {
                    console.error("Operation failed:", error.message);
                    showError(error.message);
                });
        }
    };

    useEffect(() => {
        console.log("listen");
        window.electron.ipcRenderer.on("start-record", StartRecord);
        window.electron.ipcRenderer.on("stop-record", StopRecord);
        SocketService.Listen("axtree", (response) => {
            console.log("AXTree:", response);
            if (response.status === "start") {
                window.electron.ipcRenderer.sendMessage(
                    "tree-start",
                );

            } else if (response.status === "end") {
                window.electron.ipcRenderer.sendMessage(
                    "tree-end",
                );
            }
        });

        return () => {
            console.log("remove");
            window.electron.ipcRenderer.off("start-record", StartRecord);
            window.electron.ipcRenderer.off("stop-record", StopRecord);
        };
    }, []);
    return (
        <MainContext.Provider
            value={{
                isRecording,
                setIsRecording,
                SocketService,
                openModal,
                setOpenModal,
                SystemMode,
                setSystemMode,
                uploadedTasks,
                setUploadedTasks,
                notUploadedTasks,
                setNotUploadedTasks,
                fetchTasks,
                showSuccess,
                showError,
                showInfo,
                myos: os,
                setOs,
                addNewRecording,
                
                // User-related properties
                username,
                user_id,
                userData,
                userDataTimeline,
                userDict,
                setUserDict,
                
                // Data fetching functions
                fetchStats,
                fetchUserData,
                fetchOutsideTasks,
                fetchNewTasksToVerify,
                fetchAdminTasks,
                
                // Task management properties
                annotatedTasks,
                allVerifyTasks,
                setAllVerifyTasks,
                adminTasks,
                setAdminTasks,
                hasMore,
                
                // Task Hub properties
                HubTaskId,
                setHubTaskId,
                HubTaskName,
                setHubTaskName,
                HubTaskDescription,
                setHubTaskDescription,
                suggestions,
                setSuggestions,
                tutorials,
                setTutorials,
            }}
        >
            {children}
            <Snackbar
                open={openSnackbar}
                autoHideDuration={5000}
                onClose={() => setOpenSnackbar(false)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                color={severity === "success" ? "success" : "warning"}
            >
                {message}
            </Snackbar>
            {/* {loading && (
                <Box
                    position="fixed"
                    top="10%"
                    left="50%"
                    display="flex"
                    alignItems="center"
                    flexDirection="column"
                    p={2}
                    bgcolor="background.paper"
                    boxShadow={3}
                    borderRadius={1}
                    zIndex={1300} // Higher than most components, just below Snackbar at 1400
                >
                    <Card
                        sx={{
                            position: "fixed",
                            top: "10%",
                            left: "50%",
                            transform: "translate(-50%, 0)",
                            display: "flex",
                            alignItems: "center",
                            padding: "16px",
                            boxShadow: 3,
                            borderRadius: 5,
                            zIndex: 1300, // Higher than most components, just below Snackbar at 1400
                        }}
                    >
                        <CardContent
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                flexDirection: "row",
                            }}
                        >
                            <CircularProgress />
                            <Typography>{progressMsg}</Typography>
                        </CardContent>
                    </Card>
                </Box>
            )}{" "} */}
        </MainContext.Provider>
    );
};

export const useMain = () => {
    const context = useContext(MainContext);
    if (context === undefined) {
        throw new Error("MainAuth must be used within an MainProvider");
    }
    return context;
};
