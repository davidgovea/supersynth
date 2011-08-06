(function(){
	var HEIGHT	= 500,
		WIDTH	= 800,
		imgObj	= new Image();
		Game	= new mibbu(800,500, "mibbu");
	Game.fps().init();
	
	imgObj.src	= 'images/walk.png';
	imgObj.src	= 'images/jump.png';
	imgObj.src	= 'images/stand.png';
	var mario	= new Game.spr('images/stand.png', 200, 200, 18, 1),
		pipe	= new Game.spr('images/pipe.png', 200, 125, 1, 0),
		boxes	= [
			new Game.spr('images/block.png', 116, 100, 3, 0),
			new Game.spr('images/block.png', 116, 100, 3, 0),
			new Game.spr('images/block.png', 116, 100, 3, 0)
		],
		pow		= new Game.spr('images/pow.png', 118, 100, 3, 0),
		ground	= new Game.spr('images/ground.png', 800, 78, 1, 0),
		bg		= new Game.bg('images/bg.png', 3, "S", {x:0,y:0}),
		
		floor	= 75,
		mheight	= 200,
		mwidth	= 200,
		mzero	= HEIGHT -floor - mheight+15,
		mleft	= 0,
		mright	= WIDTH-mwidth,
		pipeh	= 125,
		pipew	= 200,
		pipex	= 370,
		pipey	= HEIGHT - floor - pipeh,
		pipetop	= mzero - pipeh,
		
		xacc	= 10,
		max_vx	= 50,
		jumpv	= 160,
		gravity	= 11,
		vscale	= 0.1;
		
	mario.zone(20,20,20,20);

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
				dir		= direction || mario.dir,
				num;
			
			mario.dir = dir;
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
				mario.change('images/'+mode+'.png', 200, 200, num, 1);
			}
		//	if(dir !== mario.dir){
				mario.animation((mario.dir<0) ? 0 : 1);
				//mario.dir = dir;
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
	
	//pipe.size(pipew, pipeh);
	pipe.position(pipex, pipey, 2).speed(0);

	boxes[0].position(45, 45).speed(8);
	boxes[1].position(180, 45).speed(8);
	boxes[2].position(610, 45).speed(8);
	
	pow.position(pipex+36, 2).speed(8);
	
	ground.position(0, HEIGHT-79).speed(0);
	
	bg.speed(0).dir(180).on();

	function moveHandler(){
		var state	= "stand",
			bgspeed	= 0;
			
		if(mario.sides){
			state	= "walk";
			mario.dir	= mario.sides;
				
			if(mario.pos.x <= mleft-80 || mario.pos.x >= mright+80){
				mario.pos.x = (mario.pos.x <= mleft-80) ? mleft -79 : mright +79;
				mario.vel.x = 0;
				bgspeed = 7;
			} else {
				mario.vel.x	+= mario.dir * xacc;
				mario.vel.x	= (Math.abs(mario.vel.x) > max_vx) ? mario.sides*max_vx : mario.vel.x;
			}
			
		} else {
			if(mario.vel.x !== 0) {
				mario.vel.x *= 0.8;
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
		mario.mode(state, mario.dir).position(mario.pos.x, mario.pos.y);
		bg.speed(bgspeed * mario.dir);
		
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
