import { useEffect, useState } from "react";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DoneIcon from "@mui/icons-material/Done";
import ClearIcon from "@mui/icons-material/Clear";
import RateReviewIcon from "@mui/icons-material/RateReview";
import { Link as RouterLink } from "react-router-dom";
import { Box, Breadcrumbs, Link, Tab, Tabs, TabList, TabPanel } from "@mui/joy";
import { tabClasses } from "@mui/joy/Tab";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { useMain } from "../../../context/MainContext";
import "react-edit-text/dist/index.css";
import RegVerifyList from "./RegVerifyList";
import RegChart from "./RegChart";
import RegAnnotateList from "./RegAnnotateList";

const RegDashboard = () => {
    const { username, userData, fetchUserData, userDataTimeline } = useMain();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [stats, setStats] = useState([
        {
            id: 1,
            name: "Uploaded Tasks",
            stat: userData?.total_uploads,
            icon: CloudUploadIcon,
        },
        {
            id: 2,
            name: "Accepted Tasks",
            stat: userData?.accepted_uploads,
            icon: DoneIcon,
        },
        {
            id: 3,
            name: "Rejected Tasks",
            stat: userData?.rejected_uploads,
            icon: ClearIcon,
        },
        {
            id: 4,
            name: "Verified Tasks",
            stat: userData?.total_verify_count,
            icon: RateReviewIcon,
        },
    ]);

    // useEffect(() => {
    //     fetchUserData();
    // }, []);
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
                    <h3 className="text-3xl font-bold leading-6 mt-6 mb-2">
                        Hi! {username}
                    </h3>
                    <dl className="mx-auto grid grid-cols-1 gap-px bg-gray-900/5 sm:grid-cols-2 lg:grid-cols-4 dark:bg-gray-800 dark:bg-opacity-10">
                        {stats.map((stat) => (
                            <div
                                key={stat.name}
                                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 bg-white px-4 py-10 sm:px-6 xl:px-8 dark:bg-gray-900 dark:bg-opacity-10"
                            >
                                <dt className="text-sm font-medium leading-6 text-gray-500 dark:text-gray-400">
                                    {stat.name}
                                </dt>
                                {/* <dd
                                className={classNames(
                                    stat.changeType === 'negative' ? 'text-rose-600' : 'text-gray-700',
                                    'text-xs font-medium'
                                )}
                            >
                                {stat.change}
                            </dd> */}
                                <dd className="w-full flex-none text-3xl font-medium leading-10 tracking-tight text-gray-900 dark:text-gray-100">
                                    {stat.stat}
                                </dd>
                            </div>
                        ))}
                    </dl>
                    <RegChart data={userDataTimeline?.data} />
                </div>
                <br />
                <br />
                <Tabs
                    aria-label="Pipeline"
                    value={selectedIndex}
                    onChange={(event, value) =>
                        setSelectedIndex(value as number)
                    }
                    sx={{
                        bgcolor: "transparent",
                    }}
                >
                    <TabList
                        sx={{
                            justifyContent: "center",
                            [`&& .${tabClasses.root}`]: {
                                flex: "initial",
                                bgcolor: "transparent",
                                "&:hover": {
                                    bgcolor: "transparent",
                                },
                                [`&.${tabClasses.selected}`]: {
                                    color: "primary.plainColor",
                                    "&::after": {
                                        height: 2,
                                        borderTopLeftRadius: 3,
                                        borderTopRightRadius: 3,
                                        bgcolor: "primary.500",
                                    },
                                },
                            },
                        }}
                    >
                        <Tab indicatorInset>My Annotation</Tab>
                        <Tab indicatorInset>Verify List</Tab>
                    </TabList>
                    <Box
                        sx={(theme) => ({
                            "--bg": theme.vars.palette.background.surface,
                            background: "var(--bg)",
                            boxShadow: "0 0 0 100vmax var(--bg)",
                            clipPath: "inset(0 -100vmax)",
                        })}
                    >
                        <TabPanel value={0}>
                            <RegAnnotateList />
                        </TabPanel>

                        <TabPanel value={1}>
                            <RegVerifyList />
                        </TabPanel>
                    </Box>
                </Tabs>
            </Box>
        </div>
    );
};

export default RegDashboard;
