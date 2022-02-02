from typing import Optional
import os
import time
import json

import arrow
import requests

NATURE_REMO_TOKEN = os.environ['NATURE_REMO_TOKEN']
HUE_ACTION_API_URL = os.environ['HUE_ACTION_API_URL']
HUE_STATE_API_URL = os.environ['HUE_STATE_API_URL']


def check_lighting() -> bool:
    try:
        res = requests.get(HUE_STATE_API_URL)
        on = res.json()['state']['any_on']
        print('light', on)
        return on
    except Exception as e:
        print(e)
    return False


def check_last_moved() -> Optional[arrow.Arrow]:
    try:
        res = requests.get('https://api.nature.global/1/devices',
                           headers={'Authorization': f"Bearer {NATURE_REMO_TOKEN}"})
        for device in res.json():
            events = device['newest_events']
            if 'mo' in events and events['mo']['val'] == 1:
                last_moved = arrow.get(events['mo']['created_at'])
                print('last moved', last_moved)
                return last_moved
    except Exception as e:
        print(e)
    return None


def set_lighting(state: bool):
    requests.put(HUE_ACTION_API_URL, data=json.dumps({'on': state}))


turned_off = None
while True:
    if check_lighting():
        turned_off = None
    else:
        if not turned_off:  # just turned off!
            turned_off = arrow.now()

    if turned_off and (arrow.now() - turned_off).total_seconds() > 180:
        print('check move...')
        last_moved = check_last_moved()
        if last_moved and (arrow.now() - last_moved).total_seconds() < 60:
            print('turn on!')
            set_lighting(True)

    print('wait...')
    if turned_off:
        time.sleep(10)
    else:
        time.sleep(60)
