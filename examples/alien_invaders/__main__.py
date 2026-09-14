"""python3 -m examples.alien_invaders [--windowed]"""
import argparse
from .game import Invaders

parser = argparse.ArgumentParser(description='Stationary aliens: move, shoot, clear the row.')
parser.add_argument('--windowed', action='store_true')
args = parser.parse_args()
Invaders().run(fullscreen=not args.windowed)
