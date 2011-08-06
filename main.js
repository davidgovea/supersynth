(function(){
	var HEIGHT	= 500,
		WIDTH	= 700,
		Game	= new mibbu(700,500, "mibbu");
	Game.fps().init();
	
	 mario	= new Game.spr('standa.png', 350, 400, 18, 1);
		var pipe	= new Game.spr('img/green.png', 100, 100, 1, 0),
		boxes	= [
			new Game.spr('img/yellow.png', 100, 100, 1, 0),
			new Game.spr('img/yellow.png', 100, 100, 1, 0),
			new Game.spr('img/yellow.png', 100, 100, 1, 0)
		],
		bg		= new Game.bg('img/bg.png', 3, "S", {x:0,y:0}),
		
		floor	= 0,
		mheight	= 400,
		mwidth	= 350,
		mzero	= HEIGHT -floor - mheight,
		mleft	= 0,
		mright	= WIDTH-mwidth,
		pipeh	= 140,
		pipew	= 150,
		pipex	= 485,
		pipey	= HEIGHT - floor - pipeh,
		pipetop	= mzero - pipeh,
		
		xacc	= 10,
		max_vx	= 50,
		jumpv	= 65,
		gravity	= 1,
		vscale	= 0.1;

	_.extend(mario, {
		vel: {
			x: 0,
			y: 0
		},
		pos: {
			x: 30,
			y: mzero
		},
		state:	0,
		sides:	0,
		width:	mwidth,
		height:	mheight,
		up:		0,
		dir:	1,
		mode:	function(mode, direction){
			var	start	= false,
				dir		= direction || 0,
				num;
				
			switch(mode){
			case 'stand':
				if(mario.state !== 0){
					start = true;
					mario.state = 0;
				}
				num = 18;
				break;
				
			case 'walk':
				if(mario.state !== 1){
					start = true;
					mario.state = 1;
				}
				num = 15;
				break;
				
			case 'jump':
				if(mario.state !== 2){
					start = true;
					mario.state = 2;
				}
				num = 2;
				break;
				
			default:
			}
			
			if(start){
				mario.change(mode+'a.png', 350, 400, num, 1);
			}
		//	if(dir !== mario.dir){
				mario.animation(dir);
				mario.dir = dir;
		//	}
			mario.position(mario.x, mario.y);
			// console.log(mario.dir);
			// console.log(dir);
			return mario;
		}
	});
	console.log(mario);
	mario.size(mario.width,mario.height);
	
	mario.position(mario.pos.x, mario.pos.y, 6).speed(4);
	
	pipe.size(pipew, pipeh);
	pipe.position(pipex, pipey, 2).speed(0);

	boxes[0].position(50, 100).speed(0);
	boxes[1].position(180, 100).speed(0);
	boxes[2].position(310, 100).speed(0);
	
	bg.speed(0).dir(180).on();

	function moveHandler(){
		var state	= "stand", 
			dir		;//= mario.dir;
			
		if(mario.sides){
			state	= "walk";
			dir		= (mario.sides<0) ? 0 : 1;
			mario.vel.x	+= mario.sides * xacc;
			mario.vel.x	= (Math.abs(mario.vel.x) > max_vx) ? mario.sides*max_vx : mario.vel.x;
		} else {
			if(mario.vel.x !== 0) {
				mario.vel.x = Math.floor(mario.vel.x / 4);
			}
		}
		

		
		if(mario.pos.y < mzero){
			mario.vel.y += gravity;
			state	= "jump"
		} else {
			mario.vel.y	= 0;
			mario.pos.y	= mzero;
		}
		
		if(mario.up){
			if(mario.state !== 2){
				mario.vel.y = -jumpv;
				state = "jump";
			}
		}
		
		mario.pos.x	+= mario.vel.x * vscale;
		mario.pos.y	+= mario.vel.y * vscale;
		mario.mode(state, dir).position(mario.pos.x, mario.pos.y);
		
		
	}
	
	
	var catchKeyDown = function(e) {
		switch (e.keyCode) {
			case 13:
				//enter
				break;
			case 38: //up
				mario.up = 1;
				break;
			case 37: //left
				mario.sides = -1;
				break;
			case 39: //right
				mario.sides = 1;
				break;
		}
		e.stopPropagation();
	}
	var catchKeyUp = function(e) {
		switch (e.keyCode) {
			case 38: //up
				if (mario.up===1) mario.up = 0;
				break;
			case 37: //left
				if (mario.sides===-1) mario.sides = 0;
				break;
			case 39: //right
				if (mario.sides===1) mario.sides = 0;
				break;
		}
		//e.stopPropagation();
	}
	
	if (document.addEventListener){
		document.addEventListener("keydown",catchKeyDown,false);
		document.addEventListener("keyup",catchKeyUp,false);
	} else if (document.attachEvent){
		document.attachEvent("onkeydown",catchKeyDown);
		document.attachEvent("onkeyup",catchKeyUp);
	}
	
	
	
	
		

	mario.hit(pipe, function(){
	//	mario.x = pipe.position().x-mario.size().width-1;
		//mario.position(mario.x, mario.y);
	//	mario.touch = mario.sides;
		//mario.sides = 0;
		
	});
	
	Game.on().hook(moveHandler).hitsOn();
	
	
		
	
}());
