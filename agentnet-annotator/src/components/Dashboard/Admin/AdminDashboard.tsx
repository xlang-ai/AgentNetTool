import { Link as RouterLink } from "react-router-dom";
import { Box, Breadcrumbs, Link } from "@mui/joy";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import GroupsIcon from '@mui/icons-material/Groups';
import UploadIcon from '@mui/icons-material/Upload';
import DoneIcon from '@mui/icons-material/Done';
import CloseIcon from '@mui/icons-material/Close';
import { useMain } from "../../../context/MainContext";
import "react-edit-text/dist/index.css";
import AdminVerifyList from "./AdminVerifyList";
import { useEffect, useState } from "react";
import AdminChart from "./AdminChart";

const AdminDashboard = () => {
    const [stats, setStats] = useState([])
    const { username, showError, userDataTimeline, userData, fetchStats, user_id } = useMain();

    useEffect(() => {
        const fetchOverview = async () => {
            try {
                const response = await fetch(`http://localhost:5328/get_overview`);
                const resjson = await response.json();

                if (response.ok) {
                    console.log(resjson)
                    setStats([
                        {
                            id: 1,
                            name: "Total Users",
                            stat: resjson.overview.total_users,
                            icon: GroupsIcon,
                        },
                        {
                            id: 2,
                            name: "Total Uploaded Tasks",
                            stat: resjson.overview.total_uploaded_tasks,
                            icon: UploadIcon,
                        },
                        {
                            id: 3,
                            name: "Total Accepted Tasks",
                            stat: resjson.overview.total_accepted_tasks,
                            icon: DoneIcon,
                        },
                        {
                            id: 4,
                            name: "Total Rejected Tasks",
                            stat: resjson.overview.total_rejected_tasks,
                            icon: CloseIcon,
                        },
                    ]);
                } else {
                    showError(resjson.message);
                }
            } catch (error) {
                showError("Network error or server is down.");
            }
        };

        // fetchOverview();
        setStats([
            {
                id: 1,
                name: "Total Users",
                stat: userDataTimeline?.total_users,
                icon: GroupsIcon,
            },
            {
                id: 2,
                name: "Total Uploaded Tasks",
                stat: userDataTimeline?.total_uploaded_tasks,
                icon: UploadIcon,
            },
            {
                id: 3,
                name: "Total Accepted Tasks",
                stat: userDataTimeline?.total_accepted_tasks,
                icon: DoneIcon,
            },
            {
                id: 4,
                name: "Total Rejected Tasks",
                stat: userDataTimeline?.total_rejected_tasks,
                icon: CloseIcon,
            },
        ]);

    }, [userDataTimeline]);

    return (
        <div className="h-full max-h-full overflow-y-auto">
            <Box
                sx={{
                    px: 2,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                    height: "calc(100vh - 30px)",
                    gap: 0.5,
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    <Breadcrumbs
                        size="sm"
                        aria-label="breadcrumbs"
                        separator={<ChevronRightRoundedIcon />}
                        sx={{ pl: 0 }}
                    >
                        <Link
                            underline="none"
                            color="neutral"
                            aria-label="Home"
                            component={RouterLink}
                            to="/"
                        >
                            <HomeRoundedIcon />
                        </Link>
                        <Link
                            underline="hover"
                            color="neutral"
                            fontSize={12}
                            fontWeight={500}
                            component={RouterLink}
                            to="/dashboard"
                        >
                            dashboard
                        </Link>
                    </Breadcrumbs>
                </Box>
                <div className="px-4 mt-4">
                    <h3 className="text-3xl font-bold leading-6">
                        Hi! {username}
                        <dl className="mt-5 grid grid-cols-4 gap-4 sm:grid-cols-4 lg:grid-cols-4">
                            {stats.map((item) => (
                                <div
                                    key={item.id}
                                    className="relative overflow-hidden rounded-lg pt-5 pb-5 shadow border border-gray-200 dark:border-gray-600 sm:px-6 sm:pt-6 sm:pb-6"
                                >
                                    <dt>
                                        <div className="absolute rounded-md">
                                            <item.icon
                                                className="h-6 w-6 text-white"
                                                aria-hidden="true"
                                            />
                                        </div>
                                        <p className="ml-16 truncate text-sm font-medium">
                                            {item.name}
                                        </p>
                                    </dt>
                                    <dd className="ml-16 flex items-baseline pb-2 sm:pb-2">
                                        <p className="text-2xl font-semibold">
                                            {item.stat}
                                        </p>
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </h3>
                </div>
                <AdminChart data={userDataTimeline?.data} />
                <AdminVerifyList />
            </Box>
        </div>
    );
};

export default AdminDashboard;
