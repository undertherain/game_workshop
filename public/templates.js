export const templates = {
  platformer: {
    title:'Star Meadow', genre:'Platformer', icon:'↗', description:'Run, jump, and find your stars.', file:'platformer.py',
    controls:'jump', action:'Jump ↑', placeholder:'I want my fox to…',
    intro:'The landscape and gravity are ready. Your first little job: make the Right arrow move your fox. Write it inside update(), where pass is now. Want a hint?',
    ideas:[['Add a jump ↗','Help me add jumping to my platformer, one small step at a time.'],['Change character','How can I change my fox into a bunny?'],['My own twist ✧','Suggest two small variations I could make to this platformer. Let me choose.']],
    steps:[
      ['Write the controls','The world is ready. Make Right move your fox right, and Left move it left.','Give me a hint for implementing left and right keyboard movement in update(). Point at the place to write, but let me write it first.'],
      ['Build a jump','Teach your character to jump when you press Space.','Help me add jumping with Space. Show one small edit and explain the ground check.'],
      ['Give stars a score','Make each star add points when you collect it.','Help me add scoring when I collect a star. Let me choose how many points each is worth.'],
      ['Invent your variation','A moon bunny? Floaty jumps? Choose what makes this game yours.','Help me invent a small variation using the supported game rules. Offer two ideas and let me choose.'],
    ],
    guide:[['player.speed','How far you move each moment.'],['player.jump_height','The upward push at the start of a jump.'],['world.sky','"peach", "lavender", "mint", or "night".'],['Actor("fox", …)','Try "cat" or "bunny" as well.'],['def on_collect(star):','A rule that runs when you touch a star.']],
  },
  breaker: {
    title:'Moon Bricks', genre:'Brick breaker', icon:'▰', description:'A paddle, a ball, a satisfying bounce.', file:'breaker.py',
    controls:'restart ball', action:'Reset ball ↻', placeholder:'I want my ball to…',
    intro:'Left already works! Try it, then look at its rule in update(). Can you write a matching rule for Right? Replace pass with your idea, run it, and try your paddle.',
    ideas:[['Aim the ball ↗','Help me aim the ball by changing where it hits the paddle.'],['Bigger paddle','Show me how to make the paddle wider.'],['My own twist ✧','Suggest two small variations for my brick breaker and let me choose.']],
    steps:[
      ['Add the Right key','Left already works. Read its rule, then write the matching rule for Right.','Left movement is already implemented. Give me a hint for adding only Right movement in update(). Use the existing Left rule as the example; let me write the counterpart.'],
      ['Build an aimed bounce','Make the ball turn left or right depending on where it hits.','Help me aim the ball with the paddle. Add ball.vx based on ball.x minus paddle.x in on_paddle, using one small edit.'],
      ['Make bricks worth points','Decide how many points you earn for each brick.','Help me add points inside on_break. Let me choose how many each brick is worth.'],
      ['Invent your variation','A fast ball, a tiny paddle, or a whole new night sky?','Help me invent a small variation using supported brick breaker rules. Offer two ideas and let me choose.'],
    ],
    guide:[['paddle.speed','How quickly you move your paddle.'],['paddle.width','How wide the paddle is.'],['ball.vx / ball.vy','Ball speed sideways / vertically.'],['def on_paddle():','Your rule for bouncing off the paddle.'],['def on_break(brick):','Your rule when the ball hits a brick.']],
  },
  paratroopers: {
    title:'Sky Patrol', genre:'Paratroopers', icon:'☂', description:'Catch the falling robots in your sights.', file:'paratroopers.py',
    controls:'fire', action:'Fire ↑', placeholder:'I want my sky patrol to…',
    intro:'The robots and landscape are ready. You write the launcher’s controls: start by connecting the arrow keys inside update(), where pass is now.',
    ideas:[['Add firing ↑','Help me make Space fire my launcher. Show me one small edit.'],['Slower robots','How can I make the robots fall more slowly?'],['My own twist ✧','Suggest two small variations for Sky Patrol and let me choose.']],
    steps:[
      ['Write the controls','Robots already fall. Make the arrow keys move your launcher.','Give me a hint for implementing left and right cannon movement in update(). Point at the place to write, but let me write it first.'],
      ['Build the fire button','Make Space send a spark up toward the robots.','Help me add firing with keyboard.fire and cannon.fire() inside update. One small edit, please.'],
      ['Count your hits','Choose a score for each robot you intercept.','Help me add points inside on_hit. Let me choose the number of points.'],
      ['Invent your variation','Slow-floating robots or a speedy sky challenge?','Help me invent a small variation using supported Sky Patrol rules. Offer two ideas and let me choose.'],
    ],
    guide:[['cannon.speed','How quickly your launcher moves.'],['cannon.fire()','Sends one spark upward.'],['keyboard.fire','True when Space is first pressed.'],['world.fall_speed','How quickly the robots descend.'],['def on_hit(target):','Your rule when a spark hits a robot.']],
  },
};
