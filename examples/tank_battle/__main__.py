"""python3 -m examples.tank_battle [--windowed]"""
import argparse
from pathlib import Path
from framework.raylib_host import run
from .game import TankBattle

parser = argparse.ArgumentParser()
parser.add_argument('--windowed', action='store_true')
args = parser.parse_args()
run(TankBattle(), Path(__file__).with_name('assets'), title='Tank battle', fullscreen=not args.windowed)
