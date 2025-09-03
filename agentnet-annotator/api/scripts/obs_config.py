import json
import os


def get_obs_websocket_config_path():
    # 获取OBS WebSocket配置文件路径
    if os.name == 'nt':  # Windows
        return os.path.expandvars(r'%APPDATA%\obs-studio\plugin_config\obs-websocket\obs-websocket.ini')
    elif os.name == 'posix':
        # macOS/Linux
        return os.path.expanduser(r'~/Library/Application Support/obs-studio/plugin_config/obs-websocket')
    else:
        raise NotImplementedError('Unsupported OS')


def enable_obs_websocket():
    if os.name == 'nt':  # Windows
        pass
    elif os.name == 'posix':
        # macOS/Linux
        config_path = get_obs_websocket_config_path()

        if not os.path.exists(config_path):
            print(f"Config file not found: {config_path}")
            return

        # 读取path的json文件然后覆盖
        # config = {
        #     "alerts_enabled": false,
        #     "auth_required": false,
        #     "first_load": false,
        #     "server_enabled": true,
        #     "server_password": "N69uQP2q5EU5oUR6",
        #     "server_port": 4455
        # }
        config = {
            "alerts_enabled": False,
            "auth_required": False,
            "first_load": False,
            "server_enabled": True,
            "server_password": "N69uQP2q5EU5oUR6",
            "server_port": 4455
        }
        with open(os.path.join(config_path, 'config.json'), 'w') as file:
            json.dump(config, file)

        print(f"OBS WebSocket server has been enabled in {config_path}")
    else:
        raise NotImplementedError('Unsupported OS')


if __name__ == "__main__":
    enable_obs_websocket()
