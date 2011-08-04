(function(){
	var	Game = new mibbu(700,500, "mibbu");
	Game.fps().init();
	
	var	mario	= new Game.spr('img/grey.png', 100, 100, 1, 0);
		pipe	= new Game.spr('img/green.png', 100, 100, 1, 0),
		boxes	= [
			new Game.spr('img/yellow.png', 100, 100, 1, 0),
			new Game.spr('img/yellow.png', 100, 100, 1, 0),
			new Game.spr('img/yellow.png', 100, 100, 1, 0)
		],
		bg		= new Game.bg('img/bg.png', 3, "S", {x:0,y:0});
	
	
	var catchKeyDown = function(e) {
		switch (e.keyCode) {
			case 13:
				//enter
				break;
			case 38: //up
				mario.updown = -1;
				break;
			case 40: //down
				mario.updown = 1;
				break;
			case 37: //left
				if(mario.touch !== -1){
					mario.sides = -1;
					mario.touch = 0;
				}
				break;
			case 39: //right
				if(mario.touch !==1){
					mario.sides = 1;
					mario.touch = 0;
				}
				break;
		}
		e.stopPropagation();
	}
	var catchKeyUp = function(e) {
		switch (e.keyCode) {
			case 38: //up
				if (mario.updown===-1) mario.updown = 0;
				break;
			case 40: //down
				if (mario.updown===1) mario.updown = 0;
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
	
	mario.size(90,140);
	mario.position(30, 360, 6).speed(0);
	mario.x = 30;
	mario.y = 360;
	
	pipe.size(150,140);
	pipe.position(485, 360, 2).speed(0);
	
	boxes[0].position(50, 100).speed(0);
	boxes[1].position(180, 100).speed(0);
	boxes[2].position(310, 100).speed(0);
	
	bg.speed(4).dir(~~(Math.random()*180)).on();
	
	var additionalLoop = function(){
		if(mario.sides) mario.x += mario.sides * 4;
		
		if(mario.x < 0){ mario.sides = 0; mario.x = 0;}
		
		mario.position(mario.x,mario.y)
		
	};
	mario.hit(pipe, function(){
		mario.x += -mario.sides*2;
		mario.position(mario.x, mario.y);
		mario.touch = mario.sides;
		mario.sides = 0;
		
	});
	
	Game.on();
	Game.hook(additionalLoop).hitsOn();
	
	
		
	
}());
