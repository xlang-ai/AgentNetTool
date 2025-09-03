import * as React from "react";
import {
    GlobalStyles,
    Box,
    Sheet,
    Chip,
    Input,
    List,
    ListItem,
    ListItemButton,
    ListItemContent,
    Typography,
    Avatar,
    Divider,
    Tooltip,
    LinearProgress,
    CircularProgress,
} from "@mui/joy";
import { listItemButtonClasses } from "@mui/joy/ListItemButton";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import SupportRoundedIcon from "@mui/icons-material/SupportRounded";
import BugReportIcon from "@mui/icons-material/BugReport";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { useEffect, useState } from "react";
import ColorSchemeToggle from "./utils/ColorSchemeToggle";
import { useNavigate, Link, useParams } from "react-router-dom";
import { useMain } from "../context/MainContext";
import "../public/globals.css";

function Toggler({
    defaultExpanded = true,
    renderToggle,
    children,
}: {
    defaultExpanded?: boolean;
    children: React.ReactNode;
    renderToggle: (params: {
        open: boolean;
        setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    }) => React.ReactNode;
}) {
    const [open, setOpen] = React.useState(defaultExpanded);

    return (
        <React.Fragment>
            {renderToggle({ open, setOpen })}
            <Box
                sx={{
                    display: "grid",
                    gridTemplateRows: open ? "1fr" : "0fr",
                    transition: "0.2s ease",
                    "& > *": {
                        overflow: "hidden",
                    },
                }}
            >
                {children}
            </Box>
        </React.Fragment>
    );
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

interface SidebarProps {
    tasks?: {
        uploaded_recordings: localRecordingProp[];
        not_uploaded_recordings: onlineRecordingProp[];
    };
    init_open: boolean;
}
export default function Sidebar({ tasks, init_open }: SidebarProps) {
    const {
        uploadedTasks,
        notUploadedTasks,
        fetchTasks,
        showError,
        showInfo,
        showSuccess,
        myos,
        allVerifyTasks,
        fetchNewTasksToVerify,
        username,
        user_id,
        userData,
    } = useMain();
    const navigate = useNavigate();
    const params = useParams();
    const [open, setOpen] = useState(init_open);
    const [notUploadedTasksList, setNotUploadedTasksList] = useState(
        [...notUploadedTasks].sort((a, b) => {
            return a.task_name.localeCompare(b.task_name); // sorted by task name as default
        })
    );
    const [uploadedTasksList, setUploadedTasksList] = useState(
        [...uploadedTasks].sort((a, b) => {
            return a.task_name.localeCompare(b.task_name); // sorted by task name as default
        })
    );
    const [sortType, setSortType] = useState("creation_time");
    const [visibleNotUploadedIconIndex, setVisibleNotUploadedIconIndex] =
        useState<number | null>(null);
    const [visibleUploadedIconIndex, setVisibleUploadedIconIndex] = useState<
        number | null
    >(null);
    const [isEnablingWebSocket, setIsEnablingWebSocket] = useState(false);

    // Missing state variables for verify tasks and UI
    const [toVerifyTasksList, setToVerifyTasksList] = useState(allVerifyTasks);
    const [visibleVerifyIconIndex, setVisibleVerifyIconIndex] = useState<number | null>(null);
    const [toVerifyTasksProgress, setToVerifyTasksProgress] = useState<Record<number, number>>({});
    
    // Refs for user data and UI elements
    const LoginStatusRef = React.useRef(!!user_id);
    const user_avatar_urlRef = React.useRef("");
    const user_idRef = React.useRef(user_id);
    const usernameRef = React.useRef(username);
    const LinearProgressRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        setToVerifyTasksList(allVerifyTasks);
    }, [allVerifyTasks]);

    useEffect(() => {
        LoginStatusRef.current = !!user_id;
        user_idRef.current = user_id;
        usernameRef.current = username;
    }, [user_id, username]);

    useEffect(() => {
        console.log("Sidebar: Initial render, fetching tasks...");
        fetchTasks(); // local tasks
    }, []);

    useEffect(() => {
        console.log("Sidebar: uploadedTasks changed:", uploadedTasks);
        console.log("Sidebar: notUploadedTasks changed:", notUploadedTasks);
    }, [uploadedTasks, notUploadedTasks]);

    useEffect(() => {
        setNotUploadedTasksList(
            [...notUploadedTasks].sort((a, b) => {
                const time_a = new Date(a.creation_time);
                const time_b = new Date(b.creation_time);
                return time_b.getTime() - time_a.getTime();
            })
        );
    }, [notUploadedTasks]);

    useEffect(() => {
        setUploadedTasksList(
            [...uploadedTasks].sort((a, b) => {
                const time_a = new Date(a.creation_time);
                const time_b = new Date(b.creation_time);
                return time_b.getTime() - time_a.getTime();
            })
        );
    }, [uploadedTasks]);


    const handleSortChange = (event: any) => {
        setSortType(event.target.value);
        const sortedNotUploadedTasklist = [...notUploadedTasksList].sort(
            (a, b) => {
                if (event.target.value === "task_name") {
                    return a.task_name.localeCompare(b.task_name);
                } else {
                    const time_a = new Date(a.creation_time);
                    const time_b = new Date(b.creation_time);
                    return time_b.getTime() - time_a.getTime();
                }
            }
        );
        setNotUploadedTasksList(sortedNotUploadedTasklist);
        const sortedUploadedTasklist = [...uploadedTasksList].sort((a, b) => {
            if (event.target.value === "task_name") {
                return a.task_name.localeCompare(b.task_name);
            } else {
                const time_a = new Date(a.creation_time);
                const time_b = new Date(b.creation_time);
                return time_b.getTime() - time_a.getTime();
            }
        });
        setUploadedTasksList(sortedUploadedTasklist);
    };

    const handleDeleteRecording = async (
        recordingName: string,
        taskName: string
    ) => {
        try {
            const response = await fetch(
                `http://localhost:5328/api/recording/${recordingName}/delete_local_recording`
            );
            const result = await response.json();

            if (response.ok) {
                showSuccess(result.success);
            } else {
                showError(result.error);
            }
        } catch (error) {
            showError("Network error or server is down.");
        } finally {
            showInfo(`Task ${taskName} deleted`);
            fetchTasks();
            if (params.recording_name === recordingName) {
                navigate("/");
            }
        }
    };

    const handleDeleteVerifyRecording = async (
        recordingName: string,
        taskName: string
    ) => {
        try {
            const response = await fetch(
                `http://localhost:5328/api/recording/${recordingName}/delete_local_verify_recording`
            );
            const result = await response.json();

            if (response.ok) {
                showSuccess(result.success);
            } else {
                showError(result.error);
            }
        } catch (error) {
            showError("Network error or server is down.");
        } finally {
            showInfo(`Task ${taskName} deleted`);
            setToVerifyTasksList(
                toVerifyTasksList.filter(
                    (task) => task.recording_id !== recordingName
                )
            );
            fetchNewTasksToVerify();
            if (params.recording_name === recordingName) {
                navigate("/");
            }
        }
    };

    const handleEnableOBSWebSocket = async () => {
        setIsEnablingWebSocket(true);
        try {
            const response = await fetch(
                "http://localhost:5328/enable_obs_websocket",
                {
                    method: "GET",
                }
            );
            const result = await response.json();
            if (response.ok) {
                showSuccess("OBS WebSocket enabled successfully");
            } else {
                showError(result.error || "Failed to enable OBS WebSocket");
            }
        } catch (error) {
            showError("Network error or server is down.");
        } finally {
            setIsEnablingWebSocket(false);
        }
    };

    useEffect(() => {
        if (init_open) {
            setOpen(true);
        }
    }, [init_open]);
    return (
        <Sheet
            sx={{
                position: { xs: "fixed", md: "sticky" },
                transform: {
                    xs: "translateX(calc(100% * (var(--SideNavigation-slideIn, 0) - 1)))",
                    md: "none",
                },
                transition: "transform 0.4s, width 0.4s",
                height: "100vh",
                width: "var(--Sidebar-width)",
                top: 0,
                left: 0,
                pl: 2,
                pr: 2,
                pt: 1,
                pb: 1,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                borderRight: "1px solid",
                borderColor: "divider",
                bgcolor: "background.surface",
                overflow: "hidden",
            }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => {
                if (!init_open) {
                    setOpen(false);
                }
            }}
            className="z-5"
        >
            <GlobalStyles
                styles={(theme) => ({
                    ":root": {
                        "--Sidebar-width": open ? "20vw" : "5vw",
                        [theme.breakpoints.up("lg")]: {
                            "--Sidebar-width": open ? "240px" : "64px",
                        },
                    },
                })}
            />
            <Box
                sx={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    opacity: "var(--SideNavigation-slideIn)",
                    backgroundColor: "var(--joy-palette-background-backdrop)",
                    transition: "opacity 0.4s",
                    transform: {
                        xs: "translateX(calc(100% * (var(--SideNavigation-slideIn, 0) - 1) + var(--SideNavigation-slideIn, 0) * var(--Sidebar-width, 0px)))",
                        lg: "translateX(-100%)",
                    },
                }}
                className="z-4"
            />

            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <ColorSchemeToggle />
                {open && (
                    <Typography level="title-lg" sx={{ color: "text.primary" }}>
                        AgentNet
                    </Typography>
                )}
            </Box>
            <Input
                size="sm"
                startDecorator={<SearchRoundedIcon />}
                placeholder="Search"
                sx={{
                    "--Input-placeholderColor": "text.tertiary",
                    "--Input-decoratorColor": "text.secondary",
                }}
            />
            <Box
                sx={{
                    minHeight: 0,
                    overflow: "hidden auto",
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    [`& .${listItemButtonClasses.root}`]: {
                        gap: 1.5,
                    },
                }}
            >
                <List
                    size="sm"
                    sx={{
                        gap: 1,
                        "--List-nestedInsetStart": "30px",
                        "--ListItem-radius": (theme) => theme.vars.radius.sm,
                        "--ListItem-color": "text.primary",
                        "--ListItem-hoverColor": "text.primary",
                        "--ListItem-activeColor": "text.primary",
                    }}
                >
                    <ListItem>
                        <Link to={``}>
                            <ListItemButton>
                                <HomeRoundedIcon />
                                <ListItemContent>
                                    <Typography level="title-sm">
                                        Home
                                    </Typography>
                                </ListItemContent>
                            </ListItemButton>
                        </Link>
                    </ListItem>
                    {false && (
                        <ListItem>
                            <Link to={`dashboard`}>
                                <ListItemButton>
                                    <DashboardRoundedIcon />
                                    <ListItemContent>
                                        <Typography level="title-sm">
                                            Dashboard
                                        </Typography>
                                    </ListItemContent>
                                </ListItemButton>
                            </Link>
                        </ListItem>
                    )}

                    {true && (
                        <ListItem nested>
                            <Toggler
                                renderToggle={({ open, setOpen }) => (
                                    <ListItemButton>
                                        <AssignmentRoundedIcon />
                                        <ListItemContent
                                            sx={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                            }}
                                        >
                                            <Typography level="title-sm">
                                                Local
                                            </Typography>
                                            <div className="flex gap-1">
                                                <Tooltip
                                                    arrow
                                                    color="primary"
                                                    size="sm"
                                                    variant="solid"
                                                    title={`Sort by ${
                                                        sortType === "task_name"
                                                            ? "creation time"
                                                            : "task name"
                                                    }`}
                                                >
                                                    <SwapVertIcon
                                                        onClick={() =>
                                                            handleSortChange({
                                                                target: {
                                                                    value:
                                                                        sortType ===
                                                                        "task_name"
                                                                            ? "creation_time"
                                                                            : "task_name",
                                                                },
                                                            })
                                                        }
                                                    />
                                                </Tooltip>
                                                <Chip
                                                    size="sm"
                                                    color="primary"
                                                    variant="solid"
                                                >
                                                    {
                                                        notUploadedTasksList.length
                                                    }
                                                </Chip>
                                            </div>
                                        </ListItemContent>
                                        <KeyboardArrowDownIcon
                                            sx={{
                                                transform: open
                                                    ? "rotate(180deg)"
                                                    : "none",
                                            }}
                                            onClick={() => setOpen(!open)}
                                        />
                                    </ListItemButton>
                                )}
                            >
                                <List sx={{ gap: 0.5 }}>
                                    {notUploadedTasksList.map((recording) => (
                                        <ListItem
                                            key={recording.name}
                                            onMouseEnter={() =>
                                                setVisibleNotUploadedIconIndex(
                                                    notUploadedTasksList.indexOf(
                                                        recording
                                                    )
                                                )
                                            }
                                            onMouseLeave={() =>
                                                setVisibleNotUploadedIconIndex(
                                                    null
                                                )
                                            }
                                        >
                                            <Tooltip
                                                arrow
                                                size="md"
                                                title={recording.task_name}
                                                placement="right"
                                            >
                                                <ListItemButton className="flex flex-row justify-between w-full">
                                                    {recording.status ===
                                                    "processing" ? (
                                                        <div
                                                            style={{
                                                                maxWidth: "80%",
                                                            }}
                                                            className="flex flex-col gap-0"
                                                        >
                                                            <p className="text-sm font-semibold text-gray-400 truncate">
                                                                <div
                                                                    className="animate-spin inline-block size-3 border-[2px] border-current border-t-transparent text-gray-600 rounded-full"
                                                                    role="status"
                                                                    aria-label="loading"
                                                                >
                                                                    <span className="sr-only">
                                                                        Loading...
                                                                    </span>
                                                                </div>{" "}
                                                                {
                                                                    recording.task_name
                                                                }
                                                            </p>
                                                            <p className="text-[10px] text-gray-400">
                                                                Processing...
                                                            </p>
                                                        </div>
                                                    ) : recording.visualizable ? (
                                                        <Link
                                                            to={`tasks/${recording.name}`}
                                                            style={{
                                                                maxWidth: "80%",
                                                            }}
                                                        >
                                                            <div className="flex flex-col gap-0">
                                                                <p className="text-sm font-semibold text-black dark:text-white truncate">
                                                                    {
                                                                        recording.task_name
                                                                    }
                                                                </p>
                                                                <p className="text-[10px] text-zinc-600 dark:text-zinc-400">
                                                                    {
                                                                        recording.creation_time
                                                                    }
                                                                </p>
                                                            </div>
                                                        </Link>
                                                    ) : (
                                                        <div
                                                            style={{
                                                                maxWidth: "80%",
                                                            }}
                                                            className="flex flex-col gap-0"
                                                        >
                                                            <p className="text-sm font-semibold text-zinc-600 truncate dark:text-zinc-400">
                                                                <del>
                                                                    {
                                                                        recording.task_name
                                                                    }
                                                                </del>
                                                            </p>
                                                            <p className="text-[10px] text-zinc-600 truncate dark:text-zinc-400">
                                                                BROKEN
                                                            </p>
                                                        </div>
                                                    )}
                                                    {visibleNotUploadedIconIndex ===
                                                        notUploadedTasksList.indexOf(
                                                            recording
                                                        ) && (
                                                        <DeleteForeverIcon
                                                            className=""
                                                            onClick={() =>
                                                                handleDeleteRecording(
                                                                    recording.name,
                                                                    recording.task_name
                                                                )
                                                            }
                                                        />
                                                    )}
                                                </ListItemButton>
                                            </Tooltip>
                                        </ListItem>
                                    ))}
                                </List>
                            </Toggler>
                        </ListItem>
                    )}
                    {false && (
                        <ListItem nested>
                            <Toggler
                                renderToggle={({ open, setOpen }) => (
                                    <ListItemButton>
                                        <AssignmentRoundedIcon />
                                        <ListItemContent
                                            sx={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                            }}
                                        >
                                            <Typography level="title-sm">
                                                Uploaded
                                            </Typography>
                                            <div className="flex gap-1">
                                                <Chip
                                                    size="sm"
                                                    color="success"
                                                    variant="solid"
                                                >
                                                    {uploadedTasksList.length}
                                                </Chip>
                                            </div>
                                        </ListItemContent>
                                        <KeyboardArrowDownIcon
                                            sx={{
                                                transform: open
                                                    ? "rotate(180deg)"
                                                    : "none",
                                            }}
                                            onClick={() => setOpen(!open)}
                                        />
                                    </ListItemButton>
                                )}
                            >
                                <List sx={{ gap: 0.5 }}>
                                    {uploadedTasksList.map((recording) => (
                                        <ListItem
                                            key={recording.name}
                                            onMouseEnter={() =>
                                                setVisibleUploadedIconIndex(
                                                    uploadedTasksList.indexOf(
                                                        recording
                                                    )
                                                )
                                            }
                                            onMouseLeave={() =>
                                                setVisibleUploadedIconIndex(
                                                    null
                                                )
                                            }
                                        >
                                            <Tooltip
                                                arrow
                                                size="md"
                                                title={recording.task_name}
                                                placement="right"
                                            >
                                                <ListItemButton className="flex flex-row justify-between w-full">
                                                    {recording.status ===
                                                    "processing" ? (
                                                        <div
                                                            style={{
                                                                maxWidth: "80%",
                                                            }}
                                                            className="flex flex-col gap-0"
                                                        >
                                                            <p className="text-sm font-semibold text-gray-400 truncate">
                                                                <div
                                                                    className="animate-spin inline-block size-3 border-[2px] border-current border-t-transparent text-gray-600 rounded-full"
                                                                    role="status"
                                                                    aria-label="loading"
                                                                >
                                                                    <span className="sr-only">
                                                                        Loading...
                                                                    </span>
                                                                </div>{" "}
                                                                {
                                                                    recording.task_name
                                                                }
                                                            </p>
                                                            <p className="text-[10px] text-gray-400">
                                                                Processing...
                                                            </p>
                                                        </div>
                                                    ) : recording.visualizable ? (
                                                        <Link
                                                            to={`tasks/${recording.name}`}
                                                            style={{
                                                                maxWidth: "80%",
                                                            }}
                                                        >
                                                            <div className="flex flex-col gap-0">
                                                                <p className="text-sm font-semibold text-black dark:text-white truncate">
                                                                    {
                                                                        recording.task_name
                                                                    }
                                                                </p>
                                                                <p className="text-[10px] text-zinc-600 dark:text-zinc-400">
                                                                    {
                                                                        recording.creation_time
                                                                    }
                                                                </p>
                                                            </div>
                                                        </Link>
                                                    ) : (
                                                        <div
                                                            style={{
                                                                maxWidth: "80%",
                                                            }}
                                                            className="flex flex-col gap-0"
                                                        >
                                                            <p className="text-sm font-semibold text-zinc-600 truncate dark:text-zinc-400">
                                                                <del>
                                                                    {
                                                                        recording.task_name
                                                                    }
                                                                </del>
                                                            </p>
                                                            <p className="text-[10px] text-zinc-600 truncate dark:text-zinc-400">
                                                                BROKEN
                                                            </p>
                                                        </div>
                                                    )}
                                                    {visibleUploadedIconIndex ===
                                                        uploadedTasksList.indexOf(
                                                            recording
                                                        ) && (
                                                        <DeleteForeverIcon
                                                            className=""
                                                            onClick={() =>
                                                                handleDeleteRecording(
                                                                    recording.name,
                                                                    recording.task_name
                                                                )
                                                            }
                                                        />
                                                    )}
                                                </ListItemButton>
                                            </Tooltip>
                                        </ListItem>
                                    ))}
                                </List>{" "}
                            </Toggler>
                        </ListItem>
                    )}
                    {false && (
                        <ListItem nested>
                            <Toggler
                                renderToggle={({ open, setOpen }) => (
                                    <ListItemButton>
                                        <AssignmentRoundedIcon />
                                        <ListItemContent
                                            sx={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                            }}
                                        >
                                            <Typography level="title-sm">
                                                Verify
                                            </Typography>
                                            <div className="flex gap-1"></div>
                                        </ListItemContent>
                                        <KeyboardArrowDownIcon
                                            sx={{
                                                transform: open
                                                    ? "rotate(180deg)"
                                                    : "none",
                                            }}
                                            onClick={() => setOpen(!open)}
                                        />
                                    </ListItemButton>
                                )}
                            >
                                <List sx={{ gap: 0.5 }}>
                                    {toVerifyTasksList.map((recording) => (
                                        <ListItem
                                            key={recording.recording_id}
                                            onMouseEnter={() =>
                                                setVisibleVerifyIconIndex(
                                                    toVerifyTasksList.indexOf(
                                                        recording
                                                    )
                                                )
                                            }
                                            onMouseLeave={() =>
                                                setVisibleVerifyIconIndex(null)
                                            }
                                        >
                                            <ListItemButton className="flex flex-row justify-between">
                                                {recording.downloaded ? (
                                                    recording.visualizable ? (
                                                        <Link
                                                            to={`reviewtasks/${recording.recording_id}`}
                                                            style={{
                                                                maxWidth: "80%",
                                                            }}
                                                        >
                                                            <div className="flex flex-col gap-0">
                                                                <p className="text-sm font-semibold text-black truncate dark:text-white">
                                                                    {
                                                                        recording.task_name
                                                                    }
                                                                </p>
                                                                <p className="text-[10px] text-zinc-600 truncate dark:text-zinc-400">
                                                                    {
                                                                        recording.upload_timestamp
                                                                    }
                                                                </p>
                                                            </div>
                                                        </Link>
                                                    ) : (
                                                        <div
                                                            style={{
                                                                maxWidth: "80%",
                                                            }}
                                                            className="flex flex-col gap-0"
                                                        >
                                                            <div className="flex flex-col gap-0">
                                                                <p className="text-sm font-semibold text-zinc-600 truncate dark:text-zinc-400">
                                                                    <del>
                                                                        {
                                                                            recording.task_name
                                                                        }
                                                                    </del>
                                                                </p>
                                                                <p className="text-[10px] text-zinc-600 truncate dark:text-zinc-400">
                                                                    BROKEN
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div
                                                        style={{
                                                            maxWidth: "80%",
                                                        }}
                                                        className="flex flex-col gap-0"
                                                    >
                                                        <div className="flex flex-col gap-0 w-full">
                                                            <p className="text-sm font-semibold text-black truncate dark:text-white">
                                                                {
                                                                    recording.task_name
                                                                }
                                                            </p>
                                                            <LinearProgress
                                                                ref={
                                                                    LinearProgressRef
                                                                }
                                                                className="w-full"
                                                                determinate
                                                                value={
                                                                    toVerifyTasksProgress[
                                                                        toVerifyTasksList.indexOf(
                                                                            recording
                                                                        )
                                                                    ]
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                )}{" "}
                                                {visibleVerifyIconIndex ===
                                                    toVerifyTasksList.indexOf(
                                                        recording
                                                    ) && (
                                                    <DeleteForeverIcon
                                                        className=""
                                                        onClick={() =>
                                                            handleDeleteVerifyRecording(
                                                                recording.recording_id,
                                                                recording.task_name
                                                            )
                                                        }
                                                    />
                                                )}
                                            </ListItemButton>
                                        </ListItem>
                                    ))}
                                </List>
                            </Toggler>
                        </ListItem>
                    )}
                </List>

                <List
                    size="sm"
                    sx={{
                        mt: "auto",
                        flexGrow: 0,
                        "--ListItem-radius": (theme) => theme.vars.radius.sm,
                        "--List-gap": "8px",
                        "--ListItem-color": "text.primary",
                        "--ListItem-hoverColor": "text.primary",
                        "--ListItem-activeColor": "text.primary",
                    }}
                >
                    <ListItem>
                        <Link to={`Report`}>
                            <ListItemButton>
                                <BugReportIcon />
                                Report
                            </ListItemButton>
                        </Link>
                    </ListItem>
                    {myos === "darwin" && (
                        <ListItem>
                            <ListItemButton
                                onClick={handleEnableOBSWebSocket}
                                disabled={isEnablingWebSocket}
                            >
                                {isEnablingWebSocket ? (
                                    <CircularProgress size="sm" />
                                ) : (
                                    <SupportRoundedIcon />
                                )}
                                OBS configure
                            </ListItemButton>
                        </ListItem>
                    )}
                    <ListItem>
                        <ListItemButton>
                            <SettingsRoundedIcon />
                            Settings
                        </ListItemButton>
                    </ListItem>
                </List>
            </Box>
            <Divider />
            {!LoginStatusRef.current ? (
                <Link to={`LoginAccount`}>
                    <ListItemButton
                        className=" mb-1"
                        sx={{ color: "text.primary" }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                gap: 1,
                                alignItems: "center",
                            }}
                        >
                            <Box className="px-2">
                                <AccountCircleIcon />
                            </Box>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography level="title-sm">Login</Typography>
                                <Typography level="body-xs">
                                    Click to login
                                </Typography>
                            </Box>
                        </Box>
                    </ListItemButton>
                </Link>
            ) : (
                <Box
                    className="flex gap-1 items-center space-between w-full"
                    id={username}
                    sx={{ color: "text.primary" }}
                >
                    <Box className="px-2">
                        <Avatar
                            variant="outlined"
                            size="sm"
                            src={user_avatar_urlRef.current}
                        />
                    </Box>
                    <Tooltip title={user_idRef.current} variant="soft">
                        <div className="flex-1">
                            <p className="text-sm text-warp text-black dark:text-white">
                                {usernameRef.current}
                            </p>
                            {userData?.user_type === "BANNED" ? (
                                <Chip color="danger" variant="soft">
                                    {userData?.user_type}
                                </Chip>
                            ) : userData?.user_type === "REGULAR" ? (
                                <Chip color="primary" variant="soft">
                                    {userData?.user_type}
                                </Chip>
                            ) : userData?.user_type === "ADMIN" ? (
                                <Chip color="warning" variant="soft">
                                    {userData?.user_type}
                                </Chip>
                            ) : null}
                        </div>
                    </Tooltip>
                </Box>
            )}
        </Sheet>
    );
}
