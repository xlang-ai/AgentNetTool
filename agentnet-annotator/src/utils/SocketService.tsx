import { io, Socket } from "socket.io-client";

class SocketIOService {
    private socket: Socket;
    private backendUrl: string = "http://localhost:5328"; // 这里修改为你的 Socket.IO 服务器地址
    private token: string | null = null;

    constructor(token: string | null = null) {
        console.log("Socket service initialized with token:", token);
        if (token) {
            this.socket = io(this.backendUrl, {
                auth: {
                    token: token, // Send the token as part of the connection options
                },
            });
        } else {
            this.socket = io(this.backendUrl);
        }
        this.token = token;
        this.connect();
    }

    destroy() {
        this.disconnect();
    }

    public connect(): void {
        this.socket.connect();
    }

    public disconnect(): void {
        this.socket.disconnect();
    }

    public Send(event: string, data: any): void {
        const payload = { ...data, token: this.token };
        this.socket.emit(event, payload);
    }

    public async Get(event: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const payload = { token: this.token };
            this.socket.emit(event, payload);
            this.socket.once(event, (data) => {
                console.log("Received response from backend:", data);
                if (data.status === "succeed") {
                    resolve(data);
                } else if (data.status === "failed") {
                    reject(
                        new Error(data.message || "An unknown error occurred")
                    );
                }
            });
            return () => {
                this.socket.off(event);
            };
        });
    }

    public async GetWithParams(event: string, params: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const payload = { ...params, token: this.token };
            this.socket.emit(event, payload);
            this.socket.once(event, (data) => {
                console.log("Received response from backend:", data);
                if (data.status === "succeed") {
                    resolve(data);
                } else if (data.status === "failed") {
                    reject(
                        new Error(data.message || "An unknown error occurred")
                    );
                }
            });
            return () => {
                this.socket.off(event);
            };
        });
    }

    public async Post(event: string, data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const payload = { ...data, token: this.token };
            this.socket.emit(event, payload);

            this.socket.once(event, (response) => {
                console.log("Received response from backend:", response);
                if (response.status === "succeed") {
                    resolve(response);
                } else if (response.status === "failed") {
                    reject(
                        new Error(response.message || "An unknown error occurred")
                    );
                }
            });

            setTimeout(() => {
                reject(new Error("Timeout waiting for response"));
                this.socket.off(event);
            }, 120000);
        });
    }

    public async Download(recording_id: string, data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const payload = { ...data, token: this.token };
            this.socket.emit("download_review_recording", payload);

            this.socket.once(`download_review_recording`, (response) => {
                if (response.status === "succeed") {
                    resolve(response);
                } else if (response.status === "failed") {
                    reject(
                        new Error(response.message || "An unknown error occurred")
                    );
                }
            });

            this.socket.once(`download_review_recording${recording_id}`, (response) => {
                if (response.status === "succeed") {
                    resolve(response);
                } else if (response.status === "failed") {
                    reject(
                        new Error(response.message || "An unknown error occurred")
                    );
                }
                this.socket.off(`download_review_recording`);
            });

            setTimeout(() => {
                reject(new Error("Timeout waiting for response"));
                this.socket.off(`download_review_recording${recording_id}`);
            }, 60000);
        });
    }

    public Listen(event: string, callback: (data: any) => void): void {
        this.socket.on(event, callback);
    }

    public ListenOnce(event: string, callback: (data: any) => void): void {
        this.socket.once(event, callback);
    }

    public Unlisten(event: string): void {
        this.socket.off(event);
    }
}

export default SocketIOService;
