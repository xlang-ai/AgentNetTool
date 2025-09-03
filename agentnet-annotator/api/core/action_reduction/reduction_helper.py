CLICK_INTERVAL = 0.5
MOUSE_LONG_PRESS_INTERVAL = 1

MODIFIED_KEYS = {"alt", "alt_l", "alt_r", "alt_gr",'altleft', 'altright',
                 "ctrl", "ctrl_l", "ctrl_r",'ctrlleft', 'ctrlright',
                 "shift", "shift_l", "shift_r", 'shiftleft', 'shiftright',
                 "cmd", "cmd_l", "cmd_r", 'command', 
                 'fn', 'windows', 'win', 'winleft', 'winright', 'super', 'meta'}

# TODO
FUNCTIONAL_KEYS = {
    'tab', 'space', 'enter', 'return', 'esc', 'escape', 'backspace','up', 'down', 'left', 'right', 
    'caps', 'capslock', 'num_lock', 'numlock', 'clear', 'convert',  'decimal', 'del', 'delete', 'divide',  'end',
    'insert', 'pagedown', 'pageup', 'pause', 'pgdn', 'pgup', 'print_screen', 'power', 'numpad_lock', 'scroll',
    'accept', 'add',  'apps', 'execute', 'playpause', 'prevtrack', 'print', 'printscreen', 'prntscrn',
    'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9','f10', 'f11', 'f12', 'f13', 
    'f14', 'f15', 'f16', 'f17', 'f18', 'f19', 'f20', 'f21', 'f22', 'f23', 'f24', 
    'browserstop', 'browserforward', 'browserhome', 'browserrefresh', 'browsersearch', 'browserback', 'browserfavorites', 
    'web', 'mail', 'calculator', 'computer', 'search', 'favorites',
    'media_play_pause', 'media_volume_mute', 'media_volume_down', 'media_volume_up', 'media_next', 'media_previous',
    'volumedown', 'volumemute', 'volumeup',  'yen', 'final',  'hanguel', 'hangul', 'hanja', 'help', 'home',  
    'prtsc', 'prtscr', 'scrolllock', 'select', 'separator', 'sleep', 'stop', 'subtract',   
    'option', 'optionleft', 'optionright','menu', 'break',
    'numpad_divide', 'numpad_multiply', 'numpad_subtract', 'numpad_add', 'numpad_enter', 'numpad_decimal',
    'junja', 'kana', 'kanji', 'launchapp1', 'launchapp2', 'launchmail', 
    'ro', 'katakanahiragana', 'yen', 'henkan', 'muhenkan',
    'num0', 'num1', 'num2', 'num3', 'num4', 'num5', 'num6', 'num7', 'num8', 'num9', 
    'launchmediaselect',  'modechange', 'multiply', 'nexttrack', 'nonconvert',
    'context_menu', 'numpad_clear', 'numpad_equal', 'gamepad', 'fn_lock',
    'lang1', 'lang2', 'attn', 'crsel', 'exsel', 'ereof', 'play', 'zoom', 'pa1', 'oem_clear',
    'audio_mute', 'audio_vol_down', 'audio_vol_up', 'audio_play', 'audio_stop', 'audio_pause', 'audio_prev','audio_next',
    'brightness_down', 'brightness_up', 'abnt_c1', 'abnt_c2', 'ax', 'numpad_comma', 'eject'
    } 
    

def wrap_func_key(key: str):
    if key in MODIFIED_KEYS:
        return f"${key.split('_')[0]}$"
    elif key in FUNCTIONAL_KEYS:
        return f"${key}$"
    else:
        return key
        
def init_event(event):
    key = build_key_from_event(event)
    event["start_time"] = event["time_stamp"]
    event["end_time"] = None
    event["key"] = key
    event["complete"] = False
        
def build_key_from_event(event):
    action_type = event["action"]
    if action_type == "move":
        return (("move",), )
    elif action_type == "click":
        return (("click", event["button"]), event["pressed"])
    elif action_type == "scroll":
        return (("scroll", (event["dx"], event["dy"])), )
    elif action_type == "press":
        return (("press", event["name"]), True)
    elif action_type == "release":
        return (("press", event["name"]), False)
    else:
        raise ValueError(f"action type not supported: {action_type}")
    
def is_event_key_match(event1, event2):
    if event1 is None or event2 is None:
        return False
    return event1["key"] == event2["key"]