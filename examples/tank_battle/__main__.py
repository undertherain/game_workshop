"""python3 -m examples.tank_battle [--windowed] [--seed INTEGER]"""
import argparse
from pathlib import Path
from framework.raylib_host import run
from .game import TankBattle

parser = argparse.ArgumentParser()
parser.add_argument('--windowed', action='store_true')
parser.add_argument('--seed', type=int, help='Replay a particular generated map')
args = parser.parse_args()
run(TankBattle(seed=args.seed), Path(__file__).with_name('assets'), title='Tank battle', fullscreen=not args.windowed)
