import React, { createContext, useState, useContext, useEffect } from 'react';
import { useMain } from './MainContext';
import { adminRecordingProp, userInfoProp } from '../components/Dashboard/Admin/AdminVerifyList';

interface AdminDashboardContextType {
  adminTasks: adminRecordingProp[];
  setAdminTasks: React.Dispatch<React.SetStateAction<adminRecordingProp[]>>;
  pageidx: number;
  setPageidx: React.Dispatch<React.SetStateAction<number>>;
  uploaderValue: userInfoProp | null;
  setUploaderValue: React.Dispatch<React.SetStateAction<userInfoProp | null>>;
  verifierValue: userInfoProp | null;
  setVerifierValue: React.Dispatch<React.SetStateAction<userInfoProp | null>>;
  selectedStatus: string;
  setSelectedStatus: React.Dispatch<React.SetStateAction<string>>;
  selectedUserSource: string;
  setSelectedUserSource: React.Dispatch<React.SetStateAction<string>>;
  userDict: Record<string, string>;
  setUserDict: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  hasMore: boolean;
  setHasMore: React.Dispatch<React.SetStateAction<boolean>>;
}

const AdminDashboardContext = createContext<AdminDashboardContextType | undefined>(undefined);

export const AdminDashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pageidx, setPageidx] = useState(0);
  const [uploaderValue, setUploaderValue] = useState<userInfoProp | null>(null);
  const [verifierValue, setVerifierValue] = useState<userInfoProp | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedUserSource, setSelectedUserSource] = useState<string>("prolific");
  
  const [hasMore, setHasMore] = useState(true);

  const { adminTasks, setAdminTasks, fetchAdminTasks, userDict, setUserDict } = useMain();

  useEffect(() => {
    console.log("adminTasks", adminTasks);
    console.log("pageidx", pageidx);
    console.log("uploaderValue", uploaderValue);
    console.log("verifierValue", verifierValue);
    console.log("selectedStatus", selectedStatus);
    console.log("selectedUserSource", selectedUserSource);  
    const params = {
      page_idx: pageidx,
      ...(uploaderValue !== null && { uploader_id: uploaderValue.user_id }),
      ...(verifierValue !== null && { verifier_id: verifierValue.user_id }),
      ...(selectedStatus !== "all" && { status: selectedStatus }),
    };
    fetchAdminTasks(params);
  }, [pageidx, uploaderValue, verifierValue, selectedStatus, selectedUserSource]);

  useEffect(() => {
    const fetchUserDict = async (userSource: string | null) => {
        try {
            let res = null;
            if (userSource === null || userSource === "all") {
                res = await fetch(
                    `http://127.0.0.1:5328/get_all_user_id2name`
                );
            } else {
                const params = new URLSearchParams({
                    user_source: userSource,
                });
                res = await fetch(
                    `http://127.0.0.1:5328/get_all_user_id2name?${params}`
                );
            }

            if (!res.ok) {
                throw new Error("Network response was not ok");
            }

            const resjson = await res.json();
            console.log("User dict:", resjson.data);
            setUserDict(resjson.data);
        } catch (error) {
            console.error("Error getting user dict:", error);
        }
    };
    fetchUserDict(selectedUserSource);
}, [selectedUserSource]);

  return (
    <AdminDashboardContext.Provider value={{
      adminTasks, setAdminTasks,
      pageidx, setPageidx,
      uploaderValue, setUploaderValue,
      verifierValue, setVerifierValue,
      selectedStatus, setSelectedStatus,
      selectedUserSource, setSelectedUserSource,
      userDict, setUserDict,
      hasMore, setHasMore
    }}>
      {children}
    </AdminDashboardContext.Provider>
  );
};

export const useAdminDashboard = () => {
  const context = useContext(AdminDashboardContext);
  if (context === undefined) {
    throw new Error('useAdminDashboard must be used within an AdminDashboardProvider');
  }
  return context;
};
