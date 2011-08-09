(function(){
	var	theme	= mariotheme,
		samplesPlayed	= 0,
		noteCount	= 0,
		noteTotal	= theme.length,
		leadNote	= 0,
		leadCount	= 0,
		fade		= 0,
		fadePoint	= 0,
		loadNote	= function(){
			var note	= theme[noteCount],
				l		= note.notes.length,
				i;
			
			for(i=0; i<leads.length; i++){
				leads[i].frequency = 0;
				leads[i].reset();
			}
			
			for(i=0; i < l; i++){
				leads[i].frequency = Note.fromLatin(note.notes[i]).frequency();
			}
			leadCount = l;
			leadNote = Math.floor(note.dur * sampleRate * 1.2);
			fade = 0;
			fadePoint = leadNote - 300;
			
			noteCount += 1;
			if(noteCount >= theme.length) noteCount = 0;
		},
		dev	= new audioLib.AudioDevice(function(buffer, channelCount){
			var l	= buffer.length,
				l2	= leads.length,
				sample, note, i, n, current, notes;
			for(current=0; current<l; current+= channelCount){
				if(leadNote == 0) loadNote();
				
				if(leadNote > fadePoint){
					fade = 1 - (leadNote-fadePoint)/300;
				} else if(leadNote<300){
					fade = leadNote/300;
				} else {
					fade = 1;
				}
				
				sample = 0;
				for(i=0; i<leadCount; i++){
					leads[i].generate();
					sample += leads[i].getMix()*0.5*fade;
				}

				for (n=0; n<channelCount; n++){
					buffer[current + n] = lpf.pushSample(reverb[n].pushSample(comb(bit(comp.pushSample(sample)))));
				}
				leadNote -= 1;
				//console.log(leadNote);
			}
			//console.log(buffer);
			
			
		},2),
		sampleRate	= dev.sampleRate,
		leads	= [
			new audioLib.Oscillator(sampleRate, 220),
			new audioLib.Oscillator(sampleRate, 440),
			new audioLib.Oscillator(sampleRate, 0)
		],
		bass	= new audioLib.Oscillator(sampleRate, 0),
		comp	= new audioLib.Compressor(sampleRate, 3, 0.5),
		reverb	= [new audioLib.Reverb(sampleRate, false), new audioLib.Reverb(sampleRate, true)],
		lpf		= new audioLib.BiquadFilter.LowPass(sampleRate, 1500, 0.6),
		bitCr	= new audioLib.BitCrusher(sampleRate, 3),
		cf		= new audioLib.CombFilter(sampleRate, 800, 0.55, 0.3);
		
	function comb(s){return s;}
	function bit(s){return s;}
	reverb[0].wet = reverb[1].wet = 0.1;
	reverb[0].dry = reverb[1].dry = 0.8;
	leads[0].waveShape = leads[1].waveShape = leads[2].waveShape = 'triangle';
			
	var HEIGHT	= 500,
		WIDTH	= 800,
		walkImg	= new Image(),
		standImg= new Image(),
		jumpImg	= new Image(),
		Game	= new mibbu(800,500, "mibbu");
	Game.fps().init();
	
	walkImg.src	= 'images/walk.png';
	jumpImg.src	= 'images/jump.png';
	standImg.src= 'images/stand.png';
	
	var mario	= new Game.spr(standImg.src, 200, 200, 18, 1),
		pipe	= new Game.spr('images/pipe.png', 200, 125, 1, 0),
		boxes	= [
			new Game.spr('images/block.png', 116, 100, 3, 0),
			new Game.spr('images/block.png', 116, 100, 3, 0),
		],
		pow		= new Game.spr('images/pow.png', 118, 100, 3, 0),
		ground	= new Game.spr('images/ground.png', 800, 78, 1, 0),
		bg		= new Game.bg('images/bg.png', 3, "S", {x:0,y:0}),
		
		floor	= 75,
		mzone	= [20, 40, 12, 40]
		mheight	= 200,
		mwidth	= 200,
		mzero	= HEIGHT -floor - mheight + mzone[2],
		mleft	= 0,
		mright	= WIDTH-mwidth,
		pipeh	= 125,
		pipew	= 200,
		pipex	= 370,
		pipey	= HEIGHT - floor - pipeh,
		pipetop	= mzero - pipeh,
		
		xacc	= 5,
		max_vx	= 50,
		jumpv	= 160,
		gravity	= 11,
		vscale	= 0.1;
		
	mario.zone(mzone[0],mzone[1],mzone[2],mzone[3]);

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
		under:	false,
		mode:	function(mode, direction){
			var	start	= false,
				dir		= direction,
				num, src;
			
			//mario.dir = dir;
			switch(mode){
			case 'stand':
				if(mario.state !== 0){
					start = true;
					mario.state = 0;
				}
				src = standImg.src;
				num = 18;
				break;
				
			case 'walk':
				if(mario.state !== 1){
					start = true;
					mario.state = 1;
				}
				src = walkImg.src;
				num = 15;
				break;
				
			case 'jump':
				if(mario.state !== 2){
					start = true;
					mario.state = 2;
				}
				src = jumpImg.src;
				num = 2;
				break;
				
			default:
			}
			
			if(start){
				mario.change(src, 200, 200, num, 1);
				mario.zone(mzone[0],mzone[1],mzone[2],mzone[3]);
			}
			if(dir !== 0 && dir !== mario.dir){				
				mario.dir = dir;
			}
			mario.animation((mario.dir<0) ? 0 : 1);
			//mario.position(mario.pos.x, mario.pos.y);


			return mario;
		}
	});
	
	mario.position(mario.pos.x, mario.pos.y, 1).speed(4);
	
	//pipe.size(pipew, pipeh);
	pipe.position(pipex, HEIGHT-floor-15, 2).speed(0).noHits();

	boxes[0].position(100, 55).speed(8);
	boxes[1].position(350, 55).speed(8);
	
	pow.position(600, 55).speed(8);
	
	ground.position(0, HEIGHT-79, 2).speed(0);
	
	bg.speed(0).dir(180).on();

	function moveHandler(){
		var state	= "stand",
			bgspeed	= 0;
		
		if(!mario.under){
			if(mario.sides){
				state	= "walk";
				//mario.dir	= mario.sides;
					
				if(mario.pos.x <= mleft-80 || mario.pos.x >= mright+80){
					mario.pos.x = (mario.pos.x <= mleft-80) ? mleft -79 : mright +79;
					mario.vel.x = 0;
					bgspeed = 7;
				} else {
					mario.vel.x	+= mario.sides * xacc;
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
				if(mario.up === 1) mario.state = 0;
			}
			if(mario.up == 1){
				if(mario.state !== 2){
					mario.vel.y = -jumpv;
					state = "jump";
				}
			}
			
			if(mario.up == -1 && mario.pos.y == mzero && mario.pos.x > pipex-mzone[3] && mario.pos.x < pipex+pipew-mwidth+mzone[1]){
				state = "stand";
				mario.under = true;
				mario.vel.y = 4;
				reverb[0].wet = reverb[1].wet = 0.8;
				reverb[0].dry = reverb[1].dry = 0.1;
			}
			
			mario.pos.x	+= mario.vel.x * vscale;
			mario.pos.y	+= mario.vel.y * vscale;
			mario.mode(state, mario.sides).position(mario.pos.x, mario.pos.y);
			bg.speed(bgspeed * mario.sides);
		} else {
			if(mario.up == 1){
				mario.vel.y = -4;
				reverb[0].wet = reverb[1].wet = 0.1;
				reverb[0].dry = reverb[1].dry = 0.8;
			}
			if(mario.pos.y < mzero+mheight || mario.vel.y < 0){				
				mario.pos.y += mario.vel.y;
			}
			if(mario.vel.y < 0 && mario.pos.y <= mzero){
				mario.under = false;
				mario.pos.y = mzero;
			}
			mario.position(mario.pos.x, mario.pos.y);
		}
		
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
			case 40: //right
				mario.up = -1;
				break;
		}
		e.stopPropagation();
		e.preventDefault();
	}
	var catchKeyUp = function(e) {
		switch (e.keyCode) {
			case 38: //up
				if (mario.up===1) mario.up = 0;
				break;
			case 40: //up
				mario.up = 0;
				break;
			case 37: //left
				mario.sides = 0;
				break;
			case 39: //right
				mario.sides = 0;
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
	
	
	
	
	var shapes = ['sawtooth', 'sine', 'square', 'triangle'];
	mario.hit(boxes[0], function(){
		var s = shapes.shift();
		mario.vel.y = 0;
		boxes[0].position(100, 48);
		setTimeout(function(){
			boxes[0].position(100,55);
		}, 200)
		leads[0].waveShape = leads[1].waveShape = leads[2].waveShape = s;
		shapes.push(s);
	});
	
	var combs = [10000, 44000, null];
	mario.hit(boxes[1], function(){
		var c = combs.shift();
		mario.vel.y = 0;
		boxes[1].position(350, 48);
		setTimeout(function(){
			boxes[1].position(350,55);
		}, 200)
		if(c){
			cf.bufferSize = c;
			cf.reset();
			comb = function(s){return cf.pushSample(s)}
		} else {
			comb = function(s){return s;}
		}
		combs.push(c);
		
	});

	pow.step = 0;
	mario.hit(pow, function(){
		var h;
		pow.step++;
		switch(pow.step){
		case 1: 
			bitCr.resolution = Math.pow(2, 2);
			h = 80;
			break;
		case 2:
			bitCr.resolution = Math.pow(2, 1);
			h = 50;
			break;
		case 3:
			bit = function(s){return s;};
			h = 100;
			break;
		default:
		}
		mario.vel.y = 0;
		
		pow.size(118, h);
		if(pow.step != 3){
			bit = function(s){return bitCr.pushSample(s);};
			pow.position(600, 55);
			if(pow.step == 2){
				setTimeout(function(){
					pow.position(600,55+28);
				}, 200)
			}
		} else {
			pow.position(600, 20)
			setTimeout(function(){
				pow.position(600,55);
			}, 150)
		}
			
		pow.step %= 3;
	});
	
	Game.on().hook(moveHandler).hitsOn();
	
	
		
	
}());
