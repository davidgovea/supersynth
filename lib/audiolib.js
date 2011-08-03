/*
	audiolib.js
	Jussi Kalliokoski
	https://github.com/jussi-kalliokoski/audiolib.js
	MIT license
*/

/*
	wrapper-start.js
	Please note that the file is not of valid syntax when standalone.
*/

this.audioLib = (function AUDIOLIB(global, Math, Object, Array){

var	arrayType	= global.Float32Array || Array,
	audioLib	= this;

function Float32Array(length){
	var array = new arrayType(length);
	array.subarray = array.subarray || array.slice;
	return array;
}

audioLib.Float32Array = Float32Array;

var __define = (function(){

	if (Object.defineProperty){
		return Object.defineProperty;
	} else if (Object.prototype.__defineGetter__){
		return function(obj, prop, desc){
			desc.get && obj.__defineGetter__(prop, desc.get);
			desc.set && obj.__defineSetter__(prop, desc.set);
		}
	}

}());

function __defineConst(obj, prop, value, enumerable){
	if (__define){
		__define(obj, prop, {
			get: function(){
				return value;
			},
			enumerable: !!enumerable
		});
	} else {
		// Cheap...
		obj[prop] = value;
	}
}

__defineConst(audioLib, '__define', __define);
__defineConst(audioLib, '__defineConst', __defineConst);

function __extend(obj){
	var	args	= arguments,
		l	= args.length,
		i, n;
	for (i=1; i<l; i++){
		for (n in args[i]){
			if (args[i].hasOwnProperty(n)){
				obj[n] = args[i][n];
			}
		}
	}
	return obj;
}

__defineConst(audioLib, '__extend', __extend);

function __enum(obj, callback, unignoreInherited){
	var i;
	for (i in obj){
		(obj.hasOwnProperty(i) || unignoreInherited) && callback.call(obj, obj[i], i);
	}
	return obj;
}

__defineConst(audioLib, '__enum', __enum);
/**
 * Creates an ADSR envelope.
 *
 * @constructor
 * @this {ADSREnvelope}
 * @param {number} sampleRate Sample Rate (hz).
 * @param {number} attack (Optional) Attack (ms).
 * @param {number} decay (Optional) Decay (ms).
 * @param {number} sustain (Optional) Sustain (unsigned double).
 * @param {number} release (Optional) Release (ms).
*/
function ADSREnvelope(sampleRate, attack, decay, sustain, release){
	this.sampleRate	= isNaN(sampleRate) ? this.sampleRate : sampleRate;
	this.attack	= isNaN(attack) ? this.attack : attack;
	this.decay	= isNaN(decay) ? this.decay : decay;
	this.sustain	= isNaN(sustain) ? this.sustain : sustain;
	this.release	= isNaN(release) ? this.release : release;
}

ADSREnvelope.prototype = {
	/** The sample rate of the envelope */
	sampleRate:	44100,
	/** The attack of the envelope, in ms */
	attack:		50,
	/** The decay of the envelope, in ms */
	decay:		50,
	/** The value for the sustain state of the envelope, 0.0 - 1.0 */
	sustain:	1,
	/** The release of the envelope, in ms */
	release:	50,
	/** The current value of the envelope */
	value:		0,
	/** The current state of the envelope */
	state:		3,
	/** The state of the gate of the envelope, open being true */
	gate:		false,
/**
 * Moves the envelope status one sample further in sample-time.
 *
 * @return {Number} The current value of the envelope.
*/
	generate: function(){
		this.states[this.state].call(this);
		return this.value;
	},
/**
 * Returns the current value of the envelope.
 *
 * @return {Number} The current value of the envelope.
*/
	getMix: function(){
		return this.value;
	},
/**
 * Sets the state of the envelope's gate.
 *
 * @param {Boolean} isOpen The new state of the gate.
*/
	triggerGate: function(isOpen){
		this.gate	= isOpen;
		this.state	= isOpen ? 0 : 3;
	},
/**
 * Array of functions for handling the different states of the envelope.
*/
	states: [
		function(){ // Attack
			this.value += 1000 / this.sampleRate / this.attack;
			if (this.value >= 1){
				this.state = 1;
			}
		},
		function(){ // Decay
			this.value -= 1000 / this.sampleRate / this.decay * this.sustain;
			if (this.value <= this.sustain){
				this.state = 2;
			}
		},
		function(){ // Sustain
			this.value = this.sustain;
		},
		function(){ // Release
			this.value = Math.max(0, this.value - 1000 / this.sampleRate / this.release);
		}
	]
};
/**
 * Creates a StepSequencer.
 *
 * @constructor
 * @this {StepSequencer}
 * @param {number} samplerate Sample Rate (hz).
 * @param {number} stepLength (Optional) Step Length (ms).
 * @param {Array} steps (Optional) Array of steps (unsigned double) for the sequencer to iterate.
 * @param {number} attack (Optional) Attack.
*/
function StepSequencer(sampleRate, stepLength, steps, attack){
	var	self	= this,
		phase	= 0;

	this.sampleRate		= isNaN(sampleRate) ? this.sampleRate : sampleRate;
	this.stepLength		= isNaN(stepLength) ? this.stepLength : stepLength;
	this.steps		= steps || [1, 0];
	this.attack		= isNaN(attack) ? this.attack : attack;
}

StepSequencer.prototype = {
	/** The sample rate of the step sequencer */
	sampleRate:	44100,
	/** The length a single step of the step sequencer, in ms */
	stepLength:	200,
	/** An array of the steps of the step sequencer */
	steps:		null,
	/** The current value of the step sequencer */
	value:		0,
	/** Transition time between steps, measured in steps */
	attack:		0,
	/** The current phase of the step sequencer */
	phase:		0,

/**
 * Moves the step sequencer one sample further in sample time.
 *
 * @return {Number} The current value of the step sequencer.
*/
	generate: function(){
		var	self		= this,
			stepLength	= self.sampleRate / 1000 * self.stepLength,
			steps		= self.steps,
			sequenceLength	= stepLength * steps.length,
			step, overStep, prevStep, stepDiff,
			val;
		self.phase	= (self.phase + 1) % sequenceLength;
		step		= self.phase / sequenceLength * steps.length;
		overStep	= step % 1;
		step		= Math.floor(step);
		prevStep	= (step || steps.length) - 1;
		stepDiff	= steps[step] - steps[prevStep];
		val		= steps[step];
		if (overStep < self.attack){
			val -= stepDiff - stepDiff / self.attack * overStep;
		}
		self.value = val;
		return val;
	},
/**
 * Returns the current value of the step sequencer.
 *
 * @return {Number} The current value of the step sequencer.
*/
	getMix: function(){
		return this.value;
	},
/** Triggers the gate for the step sequencer, resetting its phase to zero. */
	triggerGate: function(){
		this.phase = 0;
	}
};
/**
 * UIControl is a tool for creating smooth, latency-balanced UI controls to interact with audio.
 *
 * @constructor
 * @this {UIControl}
 * @param {Number} sampleRate The sample rate of the UI control.
 * @param {Number} value The initial value of the UI control.
*/
function UIControl(sampleRate, value){
	this.sampleRate	= isNaN(sampleRate) ? this.sampleRate : sampleRate;
	this.schedule	= [];
	this.reset(value);
}

UIControl.prototype = {
	/** The sample rate of the UI control */
	sampleRate:	44100,
	/** The value of the UI control */
	value:		1,
	/** The internal schedule array of the UI control */
	schedule:	null,
	/** The internal clock of the UI control, indicating the previous time of a buffer callback */
	clock:		0,
/**
 * Returns the current value of the UI control
 *
 * @return {Number} The current value of the UI control
*/
	getMix:		function(){
		return this.value;
	},
	/** Moves the UI control one sample forward in the sample time */
	generate:	function(){
		var i;
		for (i=0; i<this.schedule.length; i++){
			if (this.schedule[i].t--){
				this.value = this.schedule[i].v;
				this.schedule.splice(i--, 1);
			}
		}
	},
/**
 * Sets the value of the UI control, latency balanced
 *
 * @param {Number} value The new value.
*/
	setValue:	function(value){
		this.schedule.push({
			v:	value,
			t:	~~((+new Date - this.clock) / 1000 * this.sampleRate)
		});
	},
	reset: function(value){
		this.value	= isNaN(value) ? this.value : value;
		this.clock	= +new Date;
	}
};
function FreeverbAllPassFilter(sampleRate, bufferSize, feedback){
	var	self	= this,
		sample  = 0.0,
		index	= 0;
	self.sampleRate	= sampleRate;
	self.buffer	= new Float32Array(isNaN(bufferSize) ? 500 : bufferSize);
	self.bufferSize	= self.buffer.length;
	self.feedback	= isNaN(feedback) ? 0.5 : feedback;

	self.pushSample	= function(s){
		var bufOut		= self.buffer[index];
		sample			= -s + bufOut;
		self.buffer[index++]	= s + bufOut * self.feedback;
		if (index >= self.bufferSize) {
			index = 0;
		}
		return sample;
	};
	
	self.getMix = function(){
		return sample;
	};
	
	self.reset = function(){		
		index	= 0;
		sample	= 0.0;
		self.buffer = new Float32Array(self.bufferSize);
	};
}

// Adapted from http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt

/**
 * A Custom Biquad Filter Effect
 * http://en.wikipedia.org/wiki/Digital_biquad_filter
 * 
 * @constructor
 * @this {BiquadFilter}
 * @param {number} samplerate Sample Rate (hz).
 * @param {number} b0 Biquadratic difference equation parameter
 * @param {number} b1 Biquadratic difference equation parameter
 * @param {number} b2 Biquadratic difference equation parameter
 * @param {number} a1 Biquadratic difference equation parameter
 * @param {number} a2 Biquadratic difference equation parameter
*/
function BiquadFilter(sampleRate, b0, b1, b2, a1, a2){
	this.reset.apply(this, arguments)
}

/**
 * A generic Biquad Filter class, used internally to create BiquadFilter classes.
 * @constructor
 * @this BiquadFilterClass
*/
BiquadFilter.BiquadFilterClass = function BiquadFilterClass(){
	var k;
	for (k in BiquadFilterClass.prototype){
		if (BiquadFilterClass.prototype.hasOwnProperty){
			this[k] = this[k];
		}
	}
};

BiquadFilter.BiquadFilterClass.prototype = {
	sampleRate:	44100,
	sample:		0,
	inputs:		null,
	outputs:	null,
	coefs:		null,
	pushSample: function(s){
		var	c	= this.coefs,
			i	= this.inputs,
			o	= this.outputs;
		this.sample = c.b0 * s + c.b1 * i[0] + c.b2 * i[1] - c.a1 * o[0] - c.a2 * o[1];
		i.pop();
		i.unshift(s);
		o.pop();
		o.unshift(this.sample);
		return this.sample;
	},
	getMix: function(){
		return this.sample;
	},
	reset: function(sampleRate, b0, b1, b2, a1, a2){
		this.inputs = [0,0];
		this.outputs = [0,0];
		this.sampleRate = isNaN(sampleRate) ? this.sampleRate : sampleRate;
		if (arguments.length > 1){
			this.coefs	= { b0:b0, b1:b1, b2:b2, a1:a1, a2:a2 };
		}
	}
};

/**
 * Creates a Biquad Low-Pass Filter Effect
 * 
 * @constructor
 * @this {BiquadFilter}
 * @param {number} samplerate Sample Rate (hz).
 * @param {number} cutoff Low-pass cutoff frequency (hz).
 * @param {number} Q Filter Q-factor (Q<0.5 filter underdamped, Q>0.5 filter overdamped)
*/
BiquadFilter.LowPass = function(sampleRate, cutoff, Q){
	var	w0	= 2* Math.PI*cutoff/sampleRate,
		cosw0	= Math.cos(w0),
		sinw0   = Math.sin(w0),
		alpha   = sinw0/(2*Q),
		b0	=  (1 - cosw0)/2,
		b1	=   1 - cosw0,
		b2	=   b0,
		a0	=   1 + alpha,
		a1	=  -2*cosw0,
		a2	=   1 - alpha;
	this.reset(sampleRate, b0/a0, b1/a0, b2/a0, a1/a0, a2/a0);
};

/**
 * Creates a Biquad High-Pass Filter Effect
 * 
 * @constructor
 * @this {BiquadFilter}
 * @param {number} samplerate Sample Rate (hz).
 * @param {number} cutoff High-pass cutoff frequency (hz).
 * @param {number} Q Filter Q-factor (Q<0.5 filter underdamped, Q>0.5 filter overdamped)
*/
BiquadFilter.HighPass = function(sampleRate, cutoff, Q){
	var	w0	= 2* Math.PI*cutoff/sampleRate,
		cosw0   = Math.cos(w0),
		sinw0   = Math.sin(w0),
		alpha   = sinw0/(2*Q),
		b0	=  (1 + cosw0)/2,
		b1	= -(1 + cosw0),
		b2	=   b0,
		a0	=   1 + alpha,
		a1	=  -2*cosw0,
		a2	=   1 - alpha;
	this.reset(sampleRate, b0/a0, b1/a0, b2/a0, a1/a0, a2/a0);
};

/**
 * Creates a Biquad All-Pass Filter Effect
 * 
 * @constructor
 * @this {BiquadFilter}
 * @param {number} samplerate Sample Rate (hz).
 * @param {number} f0 Significant frequency: filter will cause a phase shift of 180deg at f0 (hz).
 * @param {number} Q Filter Q-factor (Q<0.5 filter underdamped, Q>0.5 filter overdamped)
*/
BiquadFilter.AllPass = function(sampleRate, f0, Q){
	var	w0	= 2* Math.PI*f0/sampleRate,
		cosw0   = Math.cos(w0),
		sinw0   = Math.sin(w0),
		alpha   = sinw0/(2*Q),
		b0	=  1 - alpha,
		b1	= -2*cosw0,
		b2	=  1 + alpha,
		a0	=  b2,
		a1	=  b1,
		a2	=  b0;
	this.reset(sampleRate, b0/a0, b1/a0, b2/a0, a1/a0, a2/a0);
};

/**
 * Creates a Biquad Band-Pass Filter Effect
 * 
 * @constructor
 * @this {BiquadFilter}
 * @param {number} samplerate Sample Rate (hz).
 * @param {number} centerFreq Center frequency of filter: 0dB gain at center peak
 * @param {number} bandwidthInOctaves Bandwitdth of the filter (between -3dB points), specified in octaves
*/
BiquadFilter.BandPass = function(sampleRate, centerFreq, bandwidthInOctaves){
	var	w0	= 2* Math.PI*centerFreq/sampleRate,
		cosw0	= Math.cos(w0),
		sinw0	= Math.sin(w0),
		toSinh	= Math.log(2)/2 * bandwidthInOctaves * w0/sinw0,
		alpha	= sinw0*(Math.exp(toSinh) - Math.exp(-toSinh))/2,
		b0	= alpha,
		b1	= 0,
		b2	= -alpha,
		a0	= 1 + alpha,
		a1	= -2 * cosw0,
		a2	= 1 - alpha;
	this.reset(sampleRate, b0/a0, b1/a0, b2/a0, a1/a0, a2/a0);
};

(function(classes, i){
for (i=0; i<classes.length; i++){
	classes[i].prototype = new BiquadFilter.BiquadFilterClass();
}
}([BiquadFilter, BiquadFilter.LowPass, BiquadFilter.HighPass, BiquadFilter.AllPass, BiquadFilter.BandPass]));
// Adapted from http://www.musicdsp.org/archive.php?classid=4#139

/**
 * Creates a Bit Crusher Effect
 * 
 * @constructor
 * @this {BitCrusher}
 * @param {number} samplerate Sample Rate (hz).
 * @param {number} bits (Optional) Bit resolution of output signal. Defaults to 8.
*/
function BitCrusher(sampleRate, bits){
	var	self	= this,
		sample  = 0.0;
	self.sampleRate	= sampleRate;
	self.resolution	= bits ? Math.pow(2, bits-1) : Math.pow(2, 8-1); // Divided by 2 for signed samples (8bit range = 7bit signed)
	self.pushSample	= function(s){
		sample	= Math.floor(s*self.resolution+0.5)/self.resolution
		return sample;
	};
	self.getMix = function(){
		return sample;
	};
}
// Depends on oscillator.

/**
 * Creates a Chorus effect.
 *
 * @constructor
 * @this {Chorus}
 * @param {number} sampleRate Sample Rate (hz).
 * @param {number} delayTime (Optional) Delay time (ms).
 * @param {number} depth (Optional) Depth.
 * @param {number} freq (Optional) Frequency (hz) of the LFO.
*/
function Chorus(sampleRate, delayTime, depth, freq){
	var	self		= this,
		buffer, bufferPos, sample;

	self.delayTime	= delayTime || 30;
	self.depth	= depth	|| 3;
	self.freq	= freq || 0.1;

	function calcCoeff(){
		buffer = new Float32Array(self.sampleRate * 0.1);
		bufferPos = 0;
		var i, l = buffer.length;
		for (i=0; i<l; i++){
			buffer[i] = 0.0;
		}
	}

	self.sampleRate = sampleRate;
	self.osc = new Oscillator(sampleRate, freq);
	self.calcCoeff = calcCoeff;
	self.pushSample = function(s){
		if (++bufferPos >= buffer.length){
			bufferPos = 0;
		}
		buffer[bufferPos] = s;
		self.osc.generate();

		var delay = self.delayTime + self.osc.getMix() * self.depth;
		delay *= self.sampleRate / 1000;
		delay = bufferPos - Math.floor(delay);
		while(delay < 0){
			delay += buffer.length;
		}

		sample = buffer[delay];
		return sample;
	};
	self.getMix = function(){
		return sample;
	};

	calcCoeff();
}

/**
 * Creates a Comb Filter effect.
 *
 * @constructor
 * @this {CombFilter}
 * @param {number} sampleRate Sample Rate (hz).
 * @param {number} delaySize Size (in samples) of the delay line buffer.
 * @param {number} feedback (Optional) Amount of feedback (0.0-1.0). Defaults to 0.84 (Freeverb default)
 * @param {number} damping (Optional) Amount of damping (0.0-1.0). Defaults to 0.2 (Freeverb default)
*/
function CombFilter(sampleRate, delaySize, feedback, damping){
	var	self	= this,
		sample  = 0.0,
		index	= 0,
		store	= 0;
	self.sampleRate	= sampleRate;
	self.buffer	= new Float32Array(isNaN(delaySize) ? 1200 : delaySize);
	self.bufferSize	= self.buffer.length;
	self.feedback	= isNaN(feedback) ? 0.84 : feedback;
	self.damping	= isNaN(damping) ? 0.2 : damping;

	self.pushSample	= function(s){
		sample	= self.buffer[index];
		store	= sample * (1 - self.damping) + store * self.damping;	// Note: optimizable by storing (1-self.damp) like freeverb (damp2). Would require filter.setDamp(x) rather than filter.damp=x
		self.buffer[index++] = s + store * self.feedback;
		if (index >= self.bufferSize) {
			index = 0;
		}
		return sample;
	};
	
	self.getMix = function(){
		return sample;
	};
	
	self.reset = function(){		
		index	= 0;
		store	= 0;
		sample	= 0.0;
		self.buffer = new Float32Array(self.bufferSize);
	};
}/**
 * Creates a Compressor Effect
 * 
 * @constructor
 * @this {Compressor}
 * @param {number} samplerate Sample Rate (hz).
 * @param {number} scaleBy (Optional) Signal scaling factor. If mixing n unscaled waveforms, use scaleBy=n.
 * @param {number} gain (Optional) Gain factor (1.0 - 2.0).
*/
function Compressor(sampleRate, scaleBy, gain){
	var	self	= this,
		sample  = 0.0;
	self.sampleRate	= sampleRate;
	self.scale	= scaleBy || 1;
	self.gain	= gain || 0.5;
	self.pushSample = function(s){
		s	/= self.scale;
		sample	= (1 + self.gain) * s - self.gain * s * s * s;
		return sample;
	};
	self.getMix = function(){
		return sample;
	};
}
/**
 * Creates a Delay effect.
 *
 * @constructor
 * @this {Delay}
 * @param {number} samplerate Sample Rate (hz).
 * @param {number} time (Optional) Delay time (ms).
 * @param {number} feedback (Optional) Feedback (unsigned double).
*/
function Delay(sampleRate, time, feedback){
	var	self	= this;
	self.time	= isNaN(time) ? self.time : time;
	self.feedback	= isNaN(feedback) ? self.feedback : feedback;
	self.reset(sampleRate);
}

Delay.prototype = {
	/** Sample rate on which the Delay operatos on. */
	sampleRate:	1,
	/** Buffer position of the Delay. */
	bufferPos:	0,
	/** AudioBuffer in which the delay line is stored. */
	buffer:		null,
	/** Time between delays, in milliseconds. */
	time:		1000,
	/** Feedback of the Delay */
	feedback:	0,
	/** Current output of the Delay */
	sample:		0,

/**
 * Reverse sample time factor
 *
 * @private
*/
	_rstf:		1,
/**
 * Adds a new sample to the delay line, moving the effect one sample forward in sample time.
 *
 * @param {Float32} sample The sample to be added to the delay line.
 * @return {Float32} Current output of the Delay.
*/
	pushSample: function(s){
		var	self	= this,
			buffer	= self.buffer;
		buffer[self.bufferPos++] += s;
		if (self.bufferPos > self.time * self._rstf){
			self.bufferPos = 0;
		}
		self.sample = buffer[self.bufferPos];
		buffer[self.bufferPos] *= self.feedback;
		return self.sample;
	},
/**
 * Returns the current output of the Delay.
 *
 * @return {Float32} Current output of the Delay.
*/
	getMix: function(){
		return this.sample;
	},
/**
 * Changes the time value of the Delay and resamples the delay line accordingly.
 *
 * @param {Uint} time The new time value for the Delay.
 * @return {AudioBuffer} The new delay line audio buffer.
*/
// Requires Sampler
	resample: function(time){
		var	self	= this,
			ratio	= self.time / time;
		self.buffer	= audioLib.Sampler.resample(self.buffer, time);
		self.time	= time;
		self.bufferPos	= Math.round(ratio * self.bufferPos);
		return self.buffer;
	},
/**
 * Resets the delay line, to recover from sample rate changes or such.
 *
 * @param {Number} sampleRate The new sample rate. (Optional)
 * @param {Boolean} resample Determines whether to resample and apply the old buffer. (Requires Sampler)
 * @return {AudioBuffer} The new delay line audio buffer.
*/
	reset: function(sampleRate, resample){
		var	self	= this,
			buf	= self.buffer,
			i, ratio;
		sampleRate	= isNaN(sampleRate) ? self.sampleRate : sampleRate;
		ratio		= self.sampleRate / sampleRate;
		self.buffer	= new Float32Array(sampleRate * Delay.MAX_DELAY);
		self.bufferPos	= Math.round(ratio * self.bufferPos);
		self._rstf	= 1 / 1000 * sampleRate;
		if (resample){
			buf = audioLib.Sampler.resample(buf, ratio);
			for (i=0; i<buf.length && i<self.buffer.length; i++){
				self.buffer[i] = buf[i];
			}
		}
		return self.buffer;
	}
};

/** The size that will be allocated for delay line buffers on initialization, in seconds */
Delay.MAX_DELAY = 2;
// Requires IIRFilter

/**
 * Creates a Distortion effect.
 *
 * @constructor
 * @this {Distortion}
 * @param {number} sampleRate Sample Rate (hz).
*/
function Distortion(sampleRate) // Based on the famous TubeScreamer.
{
	var	hpf1	= new IIRFilter(sampleRate, 720.484),
		lpf1	= new IIRFilter(sampleRate, 723.431),
		hpf2	= new IIRFilter(sampleRate, 1.0),
		smpl	= 0.0;
	this.gain = 4;
	this.master = 1;
	this.sampleRate = sampleRate;
	this.filters = [hpf1, lpf1, hpf2];
	this.pushSample = function(s){
		hpf1.pushSample(s);
		smpl = hpf1.getMix(1) * this.gain;
		smpl = Math.atan(smpl) + smpl;
		if (smpl > 0.4){
			smpl = 0.4;
		} else if (smpl < -0.4) {
			smpl = -0.4;
		}
		lpf1.pushSample(smpl);
		hpf2.pushSample(lpf1.getMix(0));
		smpl = hpf2.getMix(1) * this.master;
		return smpl;
	};
	this.getMix = function(){
		return smpl;
	};
}
/**
 * Creates a Reverb Effect, based on the Freeverb algorithm
 * 
 * @constructor
 * @this {Freeverb}
 * @param {number} samplerate Sample Rate (hz).
 * @param {boolean} isRightChannel Controls the addition of stereo spread. Defaults to false.
 * @param {Object} tuning (Optional) Freeverb tuning overwrite object
*/
function Freeverb(sampleRate, isRightChannel, tuning){
	var	self	= this,
		sample  = 0.0;
	tuning		= tuning || Freeverb.tuning;
	self.sampleRate	= sampleRate;
	self.spread	= isRightChannel ? tuning.stereospread : 0;
	self.wet	= 0.5;
	self.dry	= 0.55;
	self.inScale	= tuning.fixedgain;
	self.CFs	= (function(){
		var 	combs	= [],
			num	= tuning.numcombs,
			damp	= tuning.initialdamp * tuning.scaledamp,
			feed	= tuning.initialroom * tuning.scaleroom + tuning.offsetroom,
			sizes	= tuning.combs,
			i;
		for(i=0; i<num; i++){
			combs.push(new audioLib.CombFilter(self.sampleRate, sizes[i] + self.spread, feed, damp));
		}
		return combs;
	}());
	self.numCFs	= self.CFs.length;
	
	self.APFs	= (function(){
		var 	apfs	= [],
			num	= tuning.numallpasses,
			feed	= 0.5,
			sizes	= tuning.allpasses,
			i;
		for(i=0; i<num; i++){
			apfs.push(new Freeverb.AllPassFilter(self.sampleRate, sizes[i] + self.spread, feed));
		}
		return apfs;
	}());
	self.numAPFs	= self.APFs.length;

	self.pushSample	= function(s){
		var	input	= s * self.inScale,
			output	= 0,
			i;
		for(i=0; i < self.numCFs; i++){
			output += self.CFs[i].pushSample(input);
		}
		for(i=0; i < self.numAPFs; i++){
			output = self.APFs[i].pushSample(output);
		}
		sample = output * self.wet + s * self.dry;
		return sample;
	};
	
	self.getMix = function(){
		return sample;
	};
	
	self.reset = function(){
		var	i;		
		for(i=0; i < self.numCFs; i++){
			self.CFs[i].reset();
		}
		for(i=0; i < self.numAPFs; i++){
			self.APFs[i].reset();
		}
		sample	= 0.0;
	};
}

// Tuning from FreeVerb source. Much of this is unused. Will optimize further once stereo effect spec makes progress
Freeverb.tuning = {
	numcombs:	8,
	combs:		[1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617],
	numallpasses:	4,
	allpasses:	[556, 441, 341, 225],
	fixedgain:	0.015,
	scalewet:	3,
	scaledry:	2,
	scaledamp:	0.4,
	scaleroom:	0.28,
	offsetroom:	0.7,
	initialroom:	0.5,
	initialdamp:	0.5,
	initialwet:	1/3,
	initialdry:	0,
	initialwidth:	1,
	initialmode:	0,
	freezemode:	0.5,
	stereospread:	23
};

/**
 * Creates an All-Pass Filter Effect, based on the Freeverb APF.
 * 
 * @constructor
 * @this {Freeverb.AllPassFilter}
 * @param {number} samplerate Sample Rate (hz).
 * @param {number} delaySize Size (in samples) of the delay line buffer.
 * @param {number} feedback (Optional) Amount of feedback (0.0-1.0). Defaults to 0.5 (Freeverb default)
*/
Freeverb.AllPassFilter = function(sampleRate, delaySize, feedback){
	var	self	= this,
		sample  = 0.0,
		index	= 0;
	self.sampleRate	= sampleRate;
	self.buffer	= new Float32Array(isNaN(delaySize) ? 500 : delaySize);
	self.bufferSize	= self.buffer.length;
	self.feedback	= isNaN(feedback) ? 0.5 : feedback;

	self.pushSample	= function(s){
		var bufOut		= self.buffer[index];
		sample			= -s + bufOut;
		self.buffer[index++]	= s + bufOut * self.feedback;
		if (index >= self.bufferSize) {
			index = 0;
		}
		return sample;
	};
	
	self.getMix = function(){
		return sample;
	};
	
	self.reset = function(){		
		index	= 0;
		sample	= 0.0;
		self.buffer = new Float32Array(self.bufferSize);
	};
};



/**
 * Creates a Gain Controller effect.
 *
 * @constructor
 * @this GainController
 * @param {Number} sampleRate The sample rate for the gain controller.
 * @param {Number} gain The gain for the gain controller.
*/
function GainController(sampleRate, gain){
	this.sampleRate	= isNaN(sampleRate) ? this.sampleRate : sampleRate;
	this.gain	= isNaN(gain) ? this.gain : gain;
}

GainController.prototype = {
	/** The sample rate of the gain controller */
	sampleRate:	44100,
	/** The gain parameter of the gain controller */
	gain:		1,
	/** The current output sample of the gain controller */
	sample:		0,
/**
 * Processes provided sample, moves the gain controller one sample forward in the sample time.
 *
 * @param {Number} s The input sample for the gain controller.
 * @return {Number} The current output sample of the controller.
*/
	pushSample:	function(s){
		this.sample	= s * this.gain;
		return this.sample;
	},
/**
 * Returns the current output sample of the controller.
 *
 * @return {Number} The current output sample of the controller.
*/
	getMix:		function(){
		return this.sample;
	}
};
// Adapted from Corban Brook's dsp.js

/**
 * Creates a IIRFilter effect.
 *
 * @constructor
 * @this {IIRFilter}
 * @param {number} samplerate Sample Rate (hz).
 * @param {number} cutoff (Optional) The cutoff frequency (hz).
 * @param {number} resonance (Optional) Resonance (unsigned double).
 * @param {number} type (Optional) The type of the filter [uint2] (LowPass, HighPass, BandPass, Notch).
*/
function IIRFilter(samplerate, cutoff, resonance, type){
	var	self	= this,
		f	= [0.0, 0.0, 0.0, 0.0],
		freq, damp,
		prevCut, prevReso,

		sin	= Math.sin,
		min	= Math.min,
		pow	= Math.pow;

	self.cutoff = !cutoff ? 20000 : cutoff; // > 40
	self.resonance = !resonance ? 0.1 : resonance; // 0.0 - 1.0
	self.samplerate = samplerate;
	self.type = type || 0;

	function calcCoeff(){
		freq = 2 * sin(Math.PI * min(0.25, self.cutoff / (self.samplerate * 2)));
		damp = min(2 * (1 - pow(self.resonance, 0.25)), min(2, 2 / freq - freq * 0.5));
	}

	self.pushSample = function(sample){
		if (prevCut !== self.cutoff || prevReso !== self.resonance){
			calcCoeff();
			prevCut = self.cutoff;
			prevReso = self.resonance;
		}

		f[3] = sample - damp * f[2];
		f[0] = f[0] + freq * f[2];
		f[1] = f[3] - f[0];
		f[2] = freq * f[1] + f[2];

		f[3] = sample - damp * f[2];
		f[0] = f[0] + freq * f[2];
		f[1] = f[3] - f[0];
		f[2] = freq * f[1] + f[2];

		return f[self.type];
	};

	self.getMix = function(type){
		return f[type || self.type];
	};
}
// Adapted from Corban Brook's dsp.js

/**
 * Creates a LP12Filter effect.
 *
 * @constructor
 * @this {LP12Filter}
 * @param {number} samplerate Sample Rate (hz).
 * @param {number} cutoff (Optional) The cutoff frequency (hz).
 * @param {number} resonance (Optional) Resonance (1.0 - 20.0).
*/
function LP12Filter(samplerate, cutoff, resonance){
	var	self		= this,
		vibraSpeed	= 0,
		vibraPos	= 0,
		pi2		= Math.PI * 2,
		w, q, r, c,
		prevCut, prevReso;

	self.cutoff = !cutoff ? 20000 : cutoff; // > 40
	self.resonance = !resonance ? 1 : resonance; // 1 - 20
	self.samplerate = samplerate;

	function calcCoeff(){
		w = pi2 * self.cutoff / self.samplerate;
		q = 1.0 - w / (2 * (self.resonance + 0.5 / (1.0 + w)) + w - 2);
		r = q * q;
		c = r + 1 - 2 * Math.cos(w) * q;
	}

	self.pushSample = function(sample){
		if (prevCut !== self.cutoff || prevReso !== self.resonance){
			calcCoeff();
			prevCut = self.cutoff;
			prevReso = self.resonance;
		}
		vibraSpeed += (sample - vibraPos) * c;
		vibraPos += vibraSpeed;
		vibraSpeed *= r;
		return vibraPos;
	};

	self.getMix = function(){
		return vibraPos;
	};

	calcCoeff();
}
/**
 * Creates a new Oscillator.
 *
 * @constructor
 * @this {Oscillator}
 * @param {Number} sampleRate The samplerate to operate the Oscillator on.
 * @param {Number} frequency The frequency of the Oscillator. (Optional)
*/function Oscillator(sampleRate, freq)
{
	var	self	= this;
	self.frequency	= isNaN(freq) ? 440 : freq;
	self.waveTable	= new Float32Array(1);
	self.sampleRate = sampleRate;
	self.waveShapes	= self.waveShapes.slice(0);
}

(function(FullPI, waveshapeNames, proto, i){

proto = Oscillator.prototype = {
	/** Determines the sample rate on which the Oscillator operates */
	sampleRate:	1,
	/** Determines the frequency of the Oscillator */
	frequency:	440,
	/** Phase of the Oscillator */
	phase:		0,
	/** Phase offset of the Oscillator */
	phaseOffset:	0,
	/** Pulse width of the Oscillator */
	pulseWidth:	0.5,
	/** Frequency modulation of the Oscillator */
	fm:		0,
	/** Wave shape of the Oscillator */
	waveShape:	'sine',
/**
 * The relative of phase of the Oscillator (pulsewidth, phase offset, etc applied).
 *
 * @private
*/
	_p:		0,

/**
 * Moves the Oscillator's phase forward by one sample.
*/
	generate: function(){
		var	self	= this,
			f	= +self.frequency,
			pw	= self.pulseWidth,
			p	= self.phase;
		f += f * self.fm;
		self.phase	= (p + f / self.sampleRate / 2) % 1;
		p		= (self.phase + self.phaseOffset) % 1;
		self._p		= p < pw ? p / pw : (p-pw) / (1-pw);
	},
/**
 * Returns the output signal sample of the Oscillator.
 *
 * @return {Float32} The output signal sample.
*/
	getMix: function(){
		return this[this.waveShape]();
	},
/**
 * Returns the relative phase of the Oscillator (pulsewidth, phaseoffset, etc applied).
 *
 * @return {Float32} The relative phase.
*/
	getPhase: function(){
		return this._p;
	},
/**
 * Resets the Oscillator phase (AND RELATIVE PHASE) to a specified value.
 *
 * @param {Float32} phase The phase to reset the values to. (Optional, defaults to 0).
*/
	reset: function(p){
		this.phase = this._p = isNaN(p) ? 0 : p;
	},
/**
 * Specifies a wavetable for the Oscillator.
 *
 * @param {AudioBuffer} wavetable The wavetable to be assigned to the Oscillator.
 * @return {Boolean} Succesfulness of the operation.
*/
	setWavetable: function(wt){
		this.waveTable = wt;
		return true;
	},
/**
 * Returns sine wave output of the Oscillator.
 * @return {Float32} Sample.
*/
// Phase for root of the function: 0.0, 0.5
	sine: function(){
		return Math.sin(this._p * FullPI);
	},
/**
 * Returns triangle wave output of the Oscillator, phase zero representing the top of the triangle.
 * @return {Float32} Sample.
*/
// Phase for root of the function: 0.25, 0.75
	triangle: function(){
		return this._p < 0.5 ? 4 * this._p - 1 : 3 - 4 * this._p;
	},
/**
 * Returns square wave output of the Oscillator, phase zero being the first position of the positive side.
 * @return {Float32} Sample.
*/
// Phase for root of the function: 0.0, 0.5
	square: function(){
		return this._p < 0.5 ? -1 : 1;
	},
/**
 * Returns sawtooth wave output of the Oscillator, phase zero representing the negative peak.
 * @return {Float32} Sample.
*/
// Phase for root of the function: 0.5
	sawtooth: function(){
		return 1 - this._p * 2;
	},
/**
 * Returns invert sawtooth wave output of the Oscillator, phase zero representing the positive peak.
 * @return {Float32} Sample.
*/
// Phase for root of the function: 0.5
	invSawtooth: function(){
		return this._p * 2 - 1;
	},
/**
 * Returns pulse wave output of the Oscillator, phase zero representing slope starting point.
 * @return {Float32} Sample.
*/
// Phase for root of the function: 0.125, 0.325
	pulse: function(){
		return this._p < 0.5 ?
			this._p < 0.25 ?
				this._p * 8 - 1 :
				1 - (this._p - 0.25) * 8 :
			-1;
	},
/**
 * Returns wavetable output of the Oscillator.
 * @return {Float32} Sample.
*/
	// Requires Sampler
	wavetable: function(){
		return audioLib.Sampler.interpolate(this.wavetable, this._p * this.wavetable.length);
	},
	waveShapes: []
};

for(i=0; i<waveshapeNames.length; i++){
	proto[i] = proto[waveshapeNames[i]];
	proto.waveShapes.push(proto[i]);
}

/**
 * Creates a new wave shape and attaches it to Oscillator.prototype by a specified name.
 *
 * @param {String} name The name of the wave shape.
 * @param {Function} algorithm The algorithm for the wave shape. If omitted, no changes are made.
 * @return {Function} The algorithm assigned to Oscillator.prototype by the specified name.
*/

Oscillator.WaveShape = function(name, algorithm){
	if (algorithm){
		this.prototype[name] = algorithm;
	}
	return this.prototype[name];
};

/**
 * Creates a new wave shape that mixes existing wave shapes into a new waveshape and attaches it to Oscillator.prototype by a specified name.
 *
 * @param {String} name The name of the wave shape.
 * @param {Array} waveshapes Array of the wave shapes to mix, wave shapes represented as objects where .shape is the name of the wave shape and .mix is the volume of the wave shape.
 * @return {Function} The algorithm created.
*/

Oscillator.createMixWave = function(name, waveshapes){
	var	l = waveshapes.length,
		smpl, i;
	return this.WaveShape(name, function(){
		smpl = 0;
		for (i=0; i<l; i++){
			smpl += this[waveshapes[i].shape]() * waveshapes[i].mix;
		}
		return smpl;
	});
};

}(Math.PI * 2, ['sine', 'triangle', 'pulse', 'sawtooth', 'invSawtooth', 'square']));
/**
 * Creates a new Sampler.
 *
 * @constructor
 * @this {Sampler}
 * @param {Number} sampleRate The samplerate to operate the Sampler on.
 * @param {Number} pitch The pitch of the Sampler. (Optional)
*/
function Sampler(sampleRate, pitch){
	var	self	= this;
	self.voices	= [];
	self.sampleRate	= sampleRate;
	self.pitch	= isNaN(pitch) ? 440 : self.pitch;
}

Sampler.prototype = {
	/** The sample rate the Sampler operates on. */
	sampleRate:	1,
	/** The relative pitch used to compare noteOn pitches to and adjust playback speed. */
	pitch:		440,
	/** Time in seconds to start the playback of the sample from. */
	delayStart:	0,
	/** Time in seconds to end the playback of the sample before the end of the sample. */
	delayEnd:	0,
	/** The maximum amount of voices allowed to be played simultaneously. */
	maxVoices:	1 / 0,
	/** The length of a single channel of the sample loaded into Sampler, in samples. */
	sampleSize:	0,
	/** An array containing information of all the voices playing currently. */
	voices:		null,
	/** The AudioBuffer representation of the sample used by the sampler. */
	sample:		null,
	/** An array containing the sample, resampled and split by channels as AudioBuffers. */
	samples:	null,
	/** An AudioData object representation of the sample used by the sampler. */
	data:		null,
/**
 * Adds a new voice to the sampler and disbands voices that go past the maxVoices limit.
 *
 * @param {Number} frequency Determines the frequency the voice should be played at, relative to the Sampler's pitch. (Optional)
 * @param {Number} velocity The relative volume of the voice. (Optional)
 * @return {Voice} The voice object created.
*/
	noteOn: function(frequency, velocity){
		frequency	= isNaN(frequency) ? this.pitch : frequency;
		var	self	= this,
			speed	= frequency / self.pitch,
			rate	= self.sampleRate,
			start	= rate * self.delayStart,
			end	= self.sampleSize - rate * self.delayEnd - 1,
			note	= {
				f:	frequency,
				p:	start,
				s:	speed,
				l:	end,
				v:	isNaN(velocity) ? 1 : velocity
			};
		self.voices.push(note);
		while (self.voices.length > self.maxVoices){
			end = self.voices.shift();
			end.onend && end.onend();
		}
		return note;
	},
/**
 * Moves all the voices one sample position further and disbands the voices that have ended.
*/
	generate: function(){
		var	voices = this.voices,
			i, voice;
		for (i=0; i<voices.length; i++){
			voice = voices[i];
			voice.p += voice.s;
			voice.p > voice.l && voices.splice(i--, 1) && voice.onend && voice.onend();
		}
	},
/**
 * Returns the mix of the voices, by a specific channel.
 *
 * @param {Int} channel The number of the channel to be returned. (Optional)
 * @return {Float32} The current output of the Sampler's channel number channel.
*/
	getMix: function(ch){
		var	voices	= this.voices,
			smpl	= 0,
			i;
		ch = ch || 0;
		if (this.samples[ch]){
			for (i=0; i<voices.length; i++){
				smpl	+= Sampler.interpolate(this.samples[ch], voices[i].p) * voices[i].v;
			}
		}
		return smpl;
	},
/**
 * Load an AudioData object to the sampler and resample if needed.
 *
 * @param {AudioData} data The AudioData object representation of the sample to be loaded.
 * @param {Boolean} resample Determines whether to resample the sample to match the sample rate of the Sampler.
*/
	load: function(data, resample){
		var	self	= this,
			samples	= self.samples = Sampler.deinterleave(data.data, data.channelCount),
			i;
		if (resample){
			for (i=0; i<samples.length; i++){
				samples[i] = Sampler.resample(samples[i], data.sampleRate, self.sampleRate);
			}
		}
		self.sample	= data.data;
		self.samples	= samples;
		self.data	= data;
		self.sampleSize = samples[0].length;
	}
};

(function(){

/**
 * If method is supplied, adds a new interpolation method to Sampler.interpolation, otherwise sets the default interpolation method (Sampler.interpolate) to the specified property of Sampler.interpolate.
 *
 * @param {String} name The name of the interpolation method to get / set.
 * @param {Function} method The interpolation method. (Optional)
*/

function interpolation(name, method){
	if (name && method){
		interpolation[name] = method;
	} else if (name && interpolation[name] instanceof Function){
		Sampler.interpolate = interpolation[name];
	}
	return interpolation[name];
}

Sampler.interpolation = interpolation;


/**
 * Interpolates a fractal part position in an array to a sample. (Linear interpolation)
 *
 * @param {Array} arr The sample buffer.
 * @param {number} pos The position to interpolate from.
 * @return {Float32} The interpolated sample.
*/
interpolation('linear', function(arr, pos){
	var	first	= Math.floor(pos),
		second	= first + 1,
		frac	= pos - first;
	second		= second < arr.length ? second : 0;
	return arr[first] * (1 - frac) + arr[second] * frac;
});

/**
 * Interpolates a fractal part position in an array to a sample. (Nearest neighbour interpolation)
 *
 * @param {Array} arr The sample buffer.
 * @param {number} pos The position to interpolate from.
 * @return {Float32} The interpolated sample.
*/
interpolation('nearest', function(arr, pos){
	return pos >= arr.length - 0.5 ? arr[0] : arr[Math.round(pos)];
});

interpolation('linear');

}());


/**
 * Resamples a sample buffer from a frequency to a frequency and / or from a sample rate to a sample rate.
 *
 * @param {Float32Array} buffer The sample buffer to resample.
 * @param {number} fromRate The original sample rate of the buffer, or if the last argument, the speed ratio to convert with.
 * @param {number} fromFrequency The original frequency of the buffer, or if the last argument, used as toRate and the secondary comparison will not be made.
 * @param {number} toRate The sample rate of the created buffer.
 * @param {number} toFrequency The frequency of the created buffer.
*/
Sampler.resample	= function(buffer, fromRate /* or speed */, fromFrequency /* or toRate */, toRate, toFrequency){
	var
		argc		= arguments.length,
		speed		= argc === 2 ? fromRate : argc === 3 ? fromRate / fromFrequency : toRate / fromRate * toFrequency / fromFrequency,
		l		= buffer.length,
		length		= Math.ceil(l / speed),
		newBuffer	= new Float32Array(length),
		i, n;
	for (i=0, n=0; i<l; i += speed){
		newBuffer[n++] = Sampler.interpolate(buffer, i);
	}
	return newBuffer;
};

/**
 * Splits a sample buffer into those of different channels.
 *
 * @param {Float32Array} buffer The sample buffer to split.
 * @param {number} channelCount The number of channels to split to.
 * @return {Array} An array containing the resulting sample buffers.
*/

Sampler.deinterleave = function(buffer, channelCount){
	var	l	= buffer.length,
		size	= l / channelCount,
		ret	= [],
		i, n;
	for (i=0; i<channelCount; i++){
		ret[i] = new Float32Array(size);
		for (n=0; n<size; n++){
			ret[i][n] = buffer[n * channelCount + i];
		}
	}
	return ret;
};

/**
 * Joins an array of sample buffers in a single buffer.
 *
 * @param {Array} buffers The buffers to join.
*/

Sampler.interleave = function(buffers){
	var	channelCount	= buffers.length,
		l		= buffers[0].length,
		buffer		= new Float32Array(l * channelCount),
		i, n;
	for (i=0; i<channelCount; i++){
		for (n=0; n<l; n++){
			buffer[i + n * channelCount] = buffers[i][n];
		}
	}
	return buffer;
};

/**
 * Mixes two or more buffers down to one.
 *
 * @param {Array} buffer The buffer to append the others to.
 * @param {Array} bufferX The buffers to append from.
*/

Sampler.mix = function(buffer){
	var	buffers	= [].slice.call(arguments, 1),
		l, i, c;
	for (c=0; c<buffers.length; c++){
		l = Math.max(buffer.length, buffers[c].length);
		for (i=0; i<l; i++){
			buffer[i] += buffers[c][i];
		}
	}
	return buffer;
};
/**
 * Creates a new Note Tracker.
 *
 * @constructor
 * @this {Tracker}
 * @param {Number} sampleRate The samplerate to operate the Oscillator on.
 * @param {Number} noteTime The note length in milliseconds
*/
function Tracker(sampleRate, noteTime, noteCallback){
    var self            = this;
    self.notes          = [];
    self.sampleRate     = sampleRate;
    self.noteTime       = isNaN(noteTime) ? 250 : noteTime;
    self.noteLength     = sampleRate * 0.001 * self.noteTime;
    self.zero           = new Float32Array(self.noteLength);
    self.cb             = noteCallback; 
}

Tracker.prototype = {
    
    pos: 0,
    
    looping: false,
    
    generate: function(){
        var self = this,
            notes,
            loopNote;
            
        if((self.pos+=1) === self.noteLength) {
            notes   = self.notes,
            loopNote = notes.shift();
            
            if(self.looping) {
                notes.push(loopNote);
            }
            
            self.pos = 0;
            self.cb(); //TODO: pass info into callback
        }
    },
    
    getMix: function(){
        var self = this,
            note = self.notes[0] || self.zero;
            
        return note[self.pos];
    },
    
/**
 * Adds a Note to be played by the Tracker
*/
    addNote: function(generatorFn){
        var self        = this,
            noteLength  = self.noteLength,
            note        = new Float32Array(noteLength),
            i           = 0;
                   
        for(i=0; i < noteLength; i++){
            note[i] = generatorFn(i);           
        }
        
        self.notes.push(note);
    },
    
    addBuffer: function(buffer){
        this.notes.push(buffer);
    },
    
    getNoteLength: function(){
        //Returns queued note count
        return this.noteLength;
    },
    
    getNoteCount: function(){
        //Returns queued note count
        return this.notes.length - 1;
    },
    
    setLooping: function(bool){
        this.looping = (typeof bool === 'undefined') ? true : bool;
    },
    
    reset: function(){
        this.notes  = [];
        this.pos    = 0;
    }

};
(function (global){
/**
 * Enumerates contents of an array as properties of an object, defined as true.
 *
 * @param {Array} arr The array to be enumerated.
 * @return {Object} The resulting object.
*/
	function propertyEnum(arr){
		var	i, l	= arr.length,
			result	= {};
		for (i=0; i<l; i++){
			result[arr[i]] = true;
		}
		return result;
	}

	var	allowedBufferSizes	= propertyEnum([256, 512, 1024, 2048, 4096, 8192, 16384]),
		allowedSampleRates	= propertyEnum([48000, 44100, 22050]),

		intToStr		= String.fromCharCode;

/**
 * Creates an AudioDevice according to specified parameters, if possible.
 *
 * @param {Function} readFn A callback to handle the buffer fills.
 * @param {number} channelCount Channel count.
 * @param {number} preBufferSize (Optional) Specifies a pre-buffer size to control the amount of latency.
 * @param {number} sampleRate Sample rate (ms).
*/
	function AudioDevice(readFn, channelCount, preBufferSize, sampleRate){
		var	devices	= AudioDevice.devices,
			dev;
		for (dev in devices){
			if (devices.hasOwnProperty(dev) && devices[dev].enabled){
				try{
					return new devices[dev](readFn, channelCount, preBufferSize, sampleRate);
				} catch(e1){};
			}
		}

		throw "No audio device available.";
	}

	function Recording(bindTo){
		this.boundTo = bindTo;
		this.buffers = [];
		bindTo.activeRecordings.push(this);
	}

	Recording.prototype = {
		add: function(buffer){
			this.buffers.push(buffer);
		}, clear: function(){
			this.buffers = [];
		}, stop: function(){
			var	recordings = this.boundTo.activeRecordings,
				i;
			for (i=0; i<recordings.length; i++){
				if (recordings[i] === this){
					recordings.splice(i--, 1);
				}
			}
		}, join: function(){
			var	bufferLength	= 0,
				bufPos		= 0,
				buffers		= this.buffers,
				newArray,
				n, i, l		= buffers.length;

			for (i=0; i<l; i++){
				bufferLength += buffers[i].length;
			}
			newArray = new Float32Array(bufferLength);
			for (i=0; i<l; i++){
				for (n=0; n<buffers[i].length; n++){
					newArray[bufPos + n] = buffers[i][n];
				}
				bufPos += buffers[i].length;
			}
			return newArray;
		}
	};

	function audioDeviceClass(type){
		this.type = type;
	}


	audioDeviceClass.prototype = {
		record: function(){
			return new Recording(this);
		}, recordData: function(buffer){
			var	activeRecs	= this.activeRecordings,
				i, l		= activeRecs.length;
			for (i=0; i<l; i++){
				activeRecs[i].add(buffer);
			}
		}, writeBuffers: function(buffer){
			var	
				buffers		= this.buffers,
				l		= buffer.length,
				buf,
				bufLength,
				i, n;
			if (buffers){
				for (i=0; i<buffers.length; i++){
					buf		= buffers[i];
					bufLength	= buf.length;
					for (n=0; n < l && n < bufLength; n++){
						buffer[n] += buf[n];
					}
					buffers[i] = buf.subarray(n);
					i >= bufLength && buffers.splice(i--, 1);
				}
			}
		}, writeBuffer: function(buffer){
			var	buffers		= this.buffers = this.buffers || [];
			buffers.push(buffer);
			return buffers.length;
		}
	};

	function mozAudioDevice(readFn, channelCount, preBufferSize, sampleRate){
		sampleRate	= allowedSampleRates[sampleRate] ? sampleRate : 44100;
		preBufferSize	= allowedBufferSizes[preBufferSize] ? preBufferSize : sampleRate / 2;
		var	self			= this,
			currentWritePosition	= 0,
			tail			= null,
			audioDevice		= new Audio(),
			written, currentPosition, available, soundData,
			timer; // Fix for https://bugzilla.mozilla.org/show_bug.cgi?id=630117

		function doInterval(callback, timeout){
			var timer, id, prev;
			if (mozAudioDevice.backgroundWork){
				if (window.MozBlobBuilder){
					prev	= new MozBlobBuilder();
					prev.append('setInterval(function(){ postMessage("tic"); }, ' + timeout + ');');
					id	= window.URL.createObjectURL(prev.getBlob());
					timer	= new Worker(id);
					timer.onmessage = function(){
						callback();
					};
					return function(){
						timer.terminate();
						window.URL.revokeObjectURL(id);
					};
				}
				id = prev = +new Date + '';
				function messageListener(e){
					if (e.source === window && e.data === id && prev < +new Date){
						prev = +new Date + timeout;
						callback();
					}
					window.postMessage(id, '*');
				}
				window.addEventListener('message', messageListener, true);
				window.postMessage(id, '*');
				return function(){
					window.removeEventListener('message', messageListener);
				};
			} else {
				timer = setInterval(callback, timeout);
				return function(){
					clearInterval(timer);
				};
			}
		}

		function bufferFill(){
			if (tail){
				written = audioDevice.mozWriteAudio(tail);
				currentWritePosition += written;
				if (written < tail.length){
					tail = tail.subarray(written);
					return tail;
				}
				tail = null;
			}

			currentPosition = audioDevice.mozCurrentSampleOffset();
			available = Number( currentPosition + preBufferSize * channelCount - currentWritePosition) + 0;
			if (available > 0){
				soundData = new Float32Array(available);
				readFn && readFn(soundData, self.channelCount);
				self.writeBuffers(soundData);
				self.recordData(soundData);
				written = audioDevice.mozWriteAudio(soundData);
				if (written < soundData.length){
					tail = soundData.subarray(written);
				}
				currentWritePosition += written;
			}
		}

		audioDevice.mozSetup(channelCount, sampleRate);
		timer = doInterval(bufferFill, 20);

		this.kill = function(){
			timer();
		};
		this.activeRecordings = [];

		this.sampleRate		= sampleRate;
		this.channelCount	= channelCount;
		this.type		= 'moz';
	}

	mozAudioDevice.enabled		= true;
	mozAudioDevice.backgroundWork	= false;
	mozAudioDevice.prototype	= new audioDeviceClass('moz');

	function webkitAudioDevice(readFn, channelCount, preBufferSize, sampleRate){
		sampleRate	= allowedSampleRates[sampleRate] ? sampleRate : 44100;
		preBufferSize	= allowedBufferSizes[preBufferSize] ? preBufferSize : 4096;
		var	self		= this,
			// For now, we have to accept that the AudioContext is at 48000Hz, or whatever it decides.
			context		= new (window.AudioContext || webkitAudioContext)(/*sampleRate*/),
			node		= context.createJavaScriptNode(preBufferSize, 0, channelCount);

		function bufferFill(e){
			var	outputBuffer	= e.outputBuffer,
				channelCount	= outputBuffer.numberOfChannels,
				i, n, l		= outputBuffer.length,
				size		= outputBuffer.size,
				channels	= new Array(channelCount),
				soundData	= new Float32Array(l * channelCount);

			for (i=0; i<channelCount; i++){
				channels[i] = outputBuffer.getChannelData(i);
			}

			readFn && readFn(soundData, channelCount);
			self.writeBuffers(soundData);
			self.recordData(soundData);

			for (i=0; i<l; i++){
				for (n=0; n < channelCount; n++){
					channels[n][i] = soundData[i * channelCount + n];
				}
			}
		}

		node.onaudioprocess = bufferFill;
		node.connect(context.destination);

		this.kill = function(){
			// ??? I have no idea how to do this.
		};
		this.activeRecordings = [];

		this.sampleRate		= context.sampleRate;
		this.channelCount	= channelCount;
		/* Keep references in order to avoid garbage collection removing the listeners, working around http://code.google.com/p/chromium/issues/detail?id=82795 */
		this._context		= context;
		this._node		= node;
		this._callback		= bufferFill;
		this.type		= 'webkit';
	}

	webkitAudioDevice.enabled	= true;
	webkitAudioDevice.prototype	= new audioDeviceClass('webkit');

	function dummyAudioDevice(readFn, channelCount, preBufferSize, sampleRate){
		sampleRate	= allowedSampleRates[sampleRate] ? sampleRate : 44100;
		preBufferSize	= allowedBufferSizes[preBufferSize] ? bufferSize : 8192;
		var 	self		= this,
			timer;

		function bufferFill(){
			var	soundData = new Float32Array(preBufferSize * channelCount);
			readFn && readFn(soundData, self.channelCount);
			self.writeBuffers(soundData);
			self.recordData(soundData);
		}

		this.kill = function(){
			clearInterval(timer);
		}
		this.activeRecordings = [];

		setInterval(bufferFill, preBufferSize / sampleRate * 1000);

		this.sampleRate		= sampleRate;
		this.channelCount	= channelCount;
		this.type		= 'dummy';
	}

	dummyAudioDevice.enabled	= true;
	dummyAudioDevice.prototype	= new audioDeviceClass('dummy');

	AudioDevice.deviceClass		= audioDeviceClass;
	AudioDevice.propertyEnum	= propertyEnum;
	AudioDevice.devices		= {
		moz:		mozAudioDevice,
		webkit:		webkitAudioDevice,
		dummy:		dummyAudioDevice
	};

	AudioDevice.Recording		= Recording;

	global.AudioDevice = AudioDevice;
}(this));
// Requires AudioDevice

this.AudioDevice.createScheduled = function(callback){
	var	schedule	= [],
		previousCall	= 0,
		dev;

	function fn(buffer, channelCount){
		var	l		= buffer.length / channelCount,
			chunkSize	= dev.chunkSize,
			chunkLength	= chunkSize * channelCount,
			n, i, ptr;
		previousCall = +new Date;
		for (i=0; i<l; i += chunkSize){
			for (n=0; n<schedule.length; n++){
				schedule[n].t -= chunkSize;
				if (schedule[n].t <= 0){
					schedule[n].f.apply(schedule[n].x, schedule[n].a);
					schedule.splice(n--, 1);
				}
			}
			ptr = i * chunkLength;
			callback(buffer.subarray(ptr, ptr + chunkLength), channelCount);
		}
	}

	dev = this.apply(this, [fn].concat(Array.prototype.splice.call(arguments, 1)));
	dev.schedule = function(callback, context, args){
		schedule.push({
			f: callback,
			x: context,
			a: args,
			t: ((new Date - previousCall) * 0.001 * this.sampleRate)
		});
	};
	dev.chunkSize = 1;
	return dev;
};
(function(){
function inject(){
	var	args	= arguments,
		l	= args.length,
		code, i;
	for (i=0; i<l; i++){
		code = args[i];
		this.postMessage({type: 'injection', code: code instanceof Function ? '(' + String(code) + ').call(this);' : code });
	}
}

audioLib.AudioWorker = function(code, injectable){
	var	blob	= new (window.MozBlobBuilder || window.BlobBuilder)(),
		url, worker;
	blob.append('var audioLib = (' + String(AUDIOLIB) + '(this, Math, Object, Array));\n');
	for (url = 0; url < audioLib.plugins._pluginList.length; url++){
		blob.append('(' + String(audioLib.plugins._pluginList[url]) + '());\n');
	}
	injectable && blob.append('this.addEventListener("message",function(e){e.data&&e.data.type==="injection"&&Function(e.data.code).call(this)}, true);\n');
	blob.append(code instanceof Function ? '(' + String(code) + ').call(this);' : code);
	url	= window.URL.createObjectURL(blob.getBlob());
	worker	= new Worker(url);
	worker._terminate	= worker.terminate;
	worker.terminate	= function(){
		window.URL.revokeObjectURL(id);
		return worker._terminate.call(worker, arguments);
	};
	if (injectable){
		worker.inject = inject;
	}
	return worker;
};

}());
/*
pcmdata.js
Uses binary.js and stream.js to parse PCM wave data.
On GitHub:
 * pcmdata.js	http://goo.gl/4uu06
 * binary.js	http://goo.gl/ZaWqK

binary.js repository also includes stream.js

MIT License
*/


(function(global, Math){

	var	fromCharCode	= String.fromCharCode,
		// the following two aren't really *performance optimization*, but compression optimization.
		y		= true,
		n		= false;

	function convertToBinaryLE(num, size){
		return size ? fromCharCode(num & 255) + convertToBinaryLE(num >> 8, size - 1) : '';
	}

	function convertToBinaryBE(num, size){ // I don't think this is right
		return size ? convertToBinaryBE(num >> 8, size - 1) + fromCharCode(255 - num & 255) : '';
	}

	function convertToBinary(num, size, bigEndian){
		return bigEndian ? convertToBinaryBE(num, size) : convertToBinaryLE(num, size);
	}

	function convertFromBinary(str, bigEndian){
		var	l	= str.length,
			last	= l - 1,
			n	= 0,
			pow	= Math.pow,
			i;
		if (bigEndian){
			for (i=0; i<l; i++){
				n += (255 - str.charCodeAt(i)) * pow(256, last - i);
			}
		} else {
			for (i=0; i < l; i++){
				n += str.charCodeAt(i) * pow(256, i);
			}
		}
		return n;
	}

	// The main function creates all the functions used.
	function Binary(bitCount, signed, /* false === unsigned */ isFloat, from /* false === to */){

		// This is all just for major optimization benefits.
		var	pow			= Math.pow,
			floor			= Math.floor,
			convertFromBinary	= Binary.convertFromBinary,
			convertToBinary		= Binary.convertToBinary,
			byteCount		= bitCount / 8,
			bitMask			= pow(2, bitCount),
			semiMask		= bitMask / 2,
			intMask			= semiMask - 1,
			invSemiMask		= 1 / semiMask,
			invIntMask		= 1 / intMask;

		return from ?
			isFloat ?
				signed ? function(num, bigEndian){
					num = floor(num < 0 ? num * semiMask + bitMask : num * intMask);
					return convertToBinary(
						num,
						byteCount,
						bigEndian
					);
				} : function(num, bigEndian){
					return convertToBinary(
						floor(num * intMask),
						byteCount,
						bigEndian
					);
				}
			:
				signed ? function(num, bigEndian){
					return convertToBinary(
						num < 0 ? num + bitMask : num,
						byteCount,
						bigEndian
					);
				} : function(num, bigEndian){
					return convertToBinary(
						num,
						byteCount,
						bigEndian
					);
				}
		:
			isFloat ?
				signed ? function(str, bigEndian){
					var num = convertFromBinary(str, bigEndian);
					return num > intMask ? (num - bitMask) * invSemiMask : num * invIntMask;
				} : function(str, bigEndian){
					return convertFromBinary(str, bigEndian) * invIntMask;
				}
			:
				signed ? function(str, bigEndian){
					var num = convertFromBinary(str, bigEndian);
					return num > intMask ? num - bitMask : num;
				} : function(str, bigEndian){
					return convertFromBinary(str, bigEndian);
				};
	}

	Binary.convertToBinary		= convertToBinary;
	Binary.convertFromBinary	= convertFromBinary;
	// these are deprecated because JS doesn't support 64 bit uint, so the conversion can't be performed.
/*
	Binary.fromFloat64		= Binary(64, y, y, y);
	Binary.toFloat64		= Binary(64, y, y, n);
*/
	Binary.fromFloat32		= Binary(32, y, y, y);
	Binary.toFloat32		= Binary(32, y, y, n);
	Binary.fromFloat24		= Binary(24, y, y, y);
	Binary.toFloat24		= Binary(24, y, y, n);
	Binary.fromFloat16		= Binary(16, y, y, y);
	Binary.toFloat16		= Binary(16, y, y, n);
	Binary.fromFloat8		= Binary(8, y, y, y);
	Binary.toFloat8			= Binary(8, y, y, n);
	Binary.fromInt32		= Binary(32, y, n, y);
	Binary.toInt32			= Binary(32, y, n, n);
	Binary.fromInt16		= Binary(16, y, n, y);
	Binary.toInt16			= Binary(16, y, n, n);
	Binary.fromInt8			= Binary( 8, y, n, y);
	Binary.toInt8			= Binary( 8, y, n, n);
	Binary.fromUint32		= Binary(32, n, n, y);
	Binary.toUint32			= Binary(32, n, n, n);
	Binary.fromUint16		= Binary(16, n, n, y);
	Binary.toUint16			= Binary(16, n, n, n);
	Binary.fromUint8		= Binary( 8, n, n, y);
	Binary.toUint8			= Binary( 8, n, n, n);

	global.Binary = Binary;
}(this, Math));
(function(global, Binary){

function Stream(data){
	this.data = data;
}

var	proto	= Stream.prototype = {
		read:		function(length){
			var	self	= this,
				data	= self.data.substr(0, length);
			self.skip(length);
			return data;
		},
		skip:		function(length){
			var	self	= this,
				data	= self.data	= self.data.substr(length);
			self.pointer	+= length;
			return data.length;
		},
		readBuffer:	function(buffer, bitCount, type){
			var	self		= this,
				converter	= 'read' + type + bitCount,
				byteCount	= bitCount / 8,
				l		= buffer.length,
				i		= 0;
			while (self.data && i < l){
				buffer[i++] = self[converter]();
			}
			return i;
		}
	},
	i, match;

function newType(type, bitCount, fn){
	var	l	= bitCount / 8;
	proto['read' + type + bitCount] = function(bigEndian){
		return fn(this.read(l), bigEndian);
	};
}

for (i in Binary){
	match	= /to([a-z]+)([0-9]+)/i.exec(i);
	match && newType(match[1], match[2], Binary[i]);
}

global.Stream	= Stream;
Stream.newType	= newType;

}(this, this.Binary));
this.PCMData = (function(Binary, Stream){

function PCMData(data){
	return (typeof data === 'string' ? PCMData.decode : PCMData.encode)(data);
}

PCMData.decodeFrame = function(frame, bitCount, result){
	if (bitCount === 8){
		var buffer	= new (window.Uint8Array || Array)(result.length);
		(new Stream(frame)).readBuffer(buffer, 8, 'Uint');
		for (bitCount=0; bitCount<result.length; bitCount++){
			result[bitCount] = (buffer[bitCount] - 127.5) * 127.5;
		}
	} else {
		(new Stream(frame)).readBuffer(result, bitCount, 'Float');
	}
	return result;
};

PCMData.encodeFrame = function(frame, bitCount){
	var	properWriter	= Binary[(bitCount === 8 ? 'fromUint' : 'fromFloat') + bitCount],
		l		= frame.length,
		r		= '',
		i;
	if (bitCount === 8){
		for (i=0; i<l; i++){
			r += properWriter(frame[i] * 127.5 + 127.5);
		}
	} else {
		for (i=0; i<l; i++){
			r += properWriter(frame[i]);
		}
	}
	return r;
};

PCMData.decode	= function(data, asyncCallback){
	var	stream			= new Stream(data),
		sGroupID1		= stream.read(4),
		dwFileLength		= stream.readUint32();
		stream			= new Stream(stream.read(dwFileLength));
	var	sRiffType		= stream.read(4),
		sGroupID2		= stream.read(4),
		dwChunkSize1		= stream.readUint32(),
		formatChunk		= new Stream(stream.read(dwChunkSize1)),
		wFormatTag		= formatChunk.readUint16(),
		wChannels		= formatChunk.readUint16(),
		dwSamplesPerSec		= formatChunk.readUint32(),
		dwAvgBytesPerSec	= formatChunk.readUint32(),
		wBlockAlign		= formatChunk.readUint16(),
		sampleSize		= wBlockAlign / wChannels,
		dwBitsPerSample		= /* dwChunkSize1 === 16 ? */ formatChunk.readUint16() /* : formatChunk.readUint32() */,
		sGroupID,
		dwChunkSize,
		sampleCount,
		chunkData,
		samples,
		dataTypeList,
		i,
		chunks	= {},
		output	= {
			channelCount:	wChannels,
			bytesPerSample:	wBlockAlign / wChannels,
			sampleRate:	dwAvgBytesPerSec / wBlockAlign,
			chunks:		chunks,
			data:		samples
		};

	function readChunk(){
		sGroupID		= stream.read(4);
		dwChunkSize		= stream.readUint32();
		chunkData		= stream.read(dwChunkSize);
		dataTypeList		= chunks[sGroupID] = chunks[sGroupID] || [];
		if (sGroupID === 'data'){
			sampleCount		= ~~(dwChunkSize / sampleSize);
			samples			= output.data = new (typeof Float32Array !== 'undefined' ? Float32Array : Array)(sampleCount);
			PCMData.decodeFrame(chunkData, sampleSize * 8, samples);
		} else {
			dataTypeList.push(chunkData);
		}
		asyncCallback && (stream.data ? setTimeout(readChunk, 1) : asyncCallback(output));
	}

	if (asyncCallback){
		stream.data ? readChunk() : asyncCallback(output);
	} else {
		while(stream.data){
			readChunk();
		}
	}
	return output;
}

PCMData.encode	= function(data, asyncCallback){
	var	
		dWord		= Binary.fromUint32,
		sWord		= Binary.fromUint16,
		samples		= data.data,
		sampleRate	= data.sampleRate,
		channelCount	= data.channelCount || 1,
		bytesPerSample	= data.bytesPerSample || 1,
		bitsPerSample	= bytesPerSample * 8,
		blockAlign	= channelCount * bytesPerSample,
		byteRate	= sampleRate * blockAlign,
		length		= samples.length,
		dLength		= length * bytesPerSample,
		padding		= Math.pow(2, bitsPerSample - 1) - 1,
		chunks		= [],
		chunk		= '',
		chunkType,
		i, n, chunkData;

		
		chunks.push(
			'fmt '				+	// sGroupID		4 bytes		char[4]
			dWord(16)			+	// dwChunkSize		4 bytes		uint32 / dword
			sWord(1)			+	// wFormatTag		2 bytes		uint16 / ushort
			sWord(channelCount)		+	// wChannels		2 bytes		uint16 / ushort
			dWord(sampleRate)		+	// dwSamplesPerSec	4 bytes		uint32 / dword
			dWord(byteRate)			+	// dwAvgBytesPerSec	4 bytes		uint32 / dword
			sWord(blockAlign)		+	// wBlockAlign		2 bytes		uint16 / ushort
			sWord(bitsPerSample)			// dwBitsPerSample	2 or 4 bytes	uint32 / dword OR uint16 / ushort
		);

		chunks.push(
			'data'				+	// sGroupID		4 bytes		char[4]
			dWord(dLength)			+	// dwChunkSize		4 bytes		uint32 / dword
			PCMData.encodeFrame(samples, bitsPerSample)
		);
		chunkData = data.chunks;
		if (chunkData){
			for (i in chunkData){
				if (chunkData.hasOwnProperty(i)){
					chunkType = chunkData[i];
					for (n=0; n<chunkType.length; n++){
						chunk = chunkType[n];
						chunks.push(i + dWord(chunk.length) + chunk);
					}
				}
			}
		}
		chunks = chunks.join('');
		chunks = 'RIFF'			+	// sGroupId		4 bytes		char[4]
			dWord(chunks.length)	+	// dwFileLength		4 bytes		uint32 / dword
			'WAVE'			+	// sRiffType		4 bytes		char[4]
			chunks;
		asyncCallback && setTimeout(function(){
			asyncCallback(chunks);
		}, 1);
		return chunks;
}

return PCMData;

}(this.Binary, this.Stream));
/**
 * A helper class for buffer-based audio analyzers, such as FFT.
 *
 * @param {Number} bufferSize Size of the buffer (a power of 2)
*/

function AudioProcessingUnit(bufferSize){
	var k;
	for (k in AudioProcessingUnit.prototype){
		if (AudioProcessingUnit.prototype.hasOwnProperty(k)){
			this[k] = AudioProcessingUnit.prototype[k];
		}
	}
	this.resetBuffer.apply(this, arguments);
}

AudioProcessingUnit.prototype = {
	bufferPos:	-1,
	pushSample: function(s){
		this.bufferPos = (this.bufferPos + 1) % this.buffer.length;
		this.bufferPos === 0 && this.process(this.buffer);
		this.buffer[this.bufferPos] = s;
		return s;
	},
	getMix: function(){
		return this.buffer[this.bufferPos];
	},
	resetBuffer: function(bufferSize){
		this.bufferSize	= isNaN(bufferSize) ? this.bufferSize : bufferSize;
		this.buffer	= new Float32Array(this.bufferSize);
		this.bufferPos	= -1;
	}
};
/**
 * Adapted from DSP.js https://github.com/corbanbrook/dsp.js/blob/master/dsp.js
*/

this.FourierTransform = (function(){

var	sin		= Math.sin,
	cos		= Math.cos,
	sqrt		= Math.sqrt,
	floor		= Math.floor,
	pow		= Math.pow,
	log		= Math.log,
	ln2		= Math.ln2,
	pi		= Math.PI,
	tau		= pi * 2;

/**
 * A general purpose FourierTransform class, from which FFT and others inherit from.
 *
 * @param {Number} sampleRate The sample rate of the FFT.
 * @param {Number} bufferSize The buffer size of the FFT. Must be a power of 2.
*/

function FourierTransform(sampleRate, bufferSize){
	var k;
	for (k in FourierTransform.prototype){
		if (FourierTransform.prototype.hasOwnProperty){
			this[k] = FourierTransform.prototype[k];
		}
	}
	AudioProcessingUnit.apply(this, [].slice.call(arguments, 1));
	this.resetFT.apply(this, arguments);
}

FourierTransform.prototype = {
	/** Resets the parameters of the FT */
	resetFT: function(sampleRate){
		var self = this;
		self.sampleRate		= isNaN(sampleRate) ? self.sampleRate : sampleRate;
		self.bandWidth		= 2 / self.bufferSize * self.sampleRate * 0.5;
		self.spectrum		= new Float32Array(self.bufferSize * 0.5);
		self.real		= new Float32Array(self.bufferSize);
		self.imag		= new Float32Array(self.bufferSize);
		self.peakBand		= 0;
		self.peak		= 0;
	},
/**
 * Gets the frequency of a specified band.
 *
 * @param {Number} index The index of the band.
 * @return {Number} The frequency.
*/
	getBandFrequency: function(index){
		return this.bandwidth * index + this.bandWidth * 0.5;
	},
	/** Calculates the spectrum of the FT */
	calculateSpectrum: function(){
		var	self		= this,
			spectrum	= self.spectrum,
			imag		= self.imag,
			bSi		= 2 / self.bufferSize,
			N		= self.bufferSize / 2,
			rval, ival, mag, i;

		for (i=0; i<N; i++){
			rval	= self.real[i];
			ival	= self.imag[i];
			mag	= bSi * sqrt(rval * rval + ival * ival);

			if (mag > self.peak){
				self.peakBand	= i;
				self.peak	= mag;
			}

			spectrum[i] = mag;
		}
	}
};

/**
 * A Fast Fourier Transform processor class.
 *
 * @constructor
 * @this {FFT}
 * @param {Number} sampleRate The sample rate of the FFT.
 * @param {Number} bufferSize The buffer size of the FFT. Must be a power of 2.
*/

function FFT(sampleRate, bufferSize){
	FourierTransform.apply(this, arguments);
	this.reset();
}

FFT.prototype = {
	sampleRate:	44100,
	bufferSize:	2048,
	method:		'forward',
	/** Resets the FFT */
	reset: function(){
		this.resetBuffer.apply(this, arguments);
		this.resetFT.apply(this, arguments);

		this.reverseTable = new Uint32Array(this.bufferSize);

		var	limit	= 1,
			bit	= this.bufferSize >> 1,
			i;

		while (limit < this.bufferSize){
			for (i=0; i<limit; i++){
				this.reverseTable[i + limit] = this.reverseTable[i] + bit;
			}

			limit	= limit << 1;
			bit	= bit >> 1;
		}
	},
/**
 * Performs a FFT on the specified buffer.
 *
 * @param {Float32Array} buffer The buffer to perform the operation on. (Optional)
*/
	forward: function(buffer){
		var	self			= this,
			bufferSize		= self.bufferSize,
			reverseTable		= self.reverseTable,
			real			= self.real,
			imag			= self.imag,
			spectrum		= self.spectrum,
			k			= floor(log(bufferSize) / ln2),
			halfSize		= 1,
			phaseShiftStepReal,
			phaseShiftStepImag,
			currentPhaseShiftReal,
			currentPhaseShiftImag,
			off, tr, ti, tmpReal, i, hsrad, fftStep, size;

		for (i=0; i<bufferSize; i++){
			real[i]	= buffer[reverseTable[i]];
			imag[i]	= 0;
		}

		while (halfSize < bufferSize){
			hsrad			= -Math.PI / halfSize;
			phaseShiftStepReal	= cos(hsrad);
			phaseShiftStepImag	= sin(hsrad);

			currentPhaseShiftReal	= 1;
			currentPhaseShiftImag	= 0;

			size = halfSize * 2;

			for (fftStep = 0; fftStep < halfSize; fftStep++){
				i = fftStep;
				while (i < bufferSize){
					off	= i + halfSize;
					tr	= currentPhaseShiftReal * real[off] + currentPhaseShiftImag * imag[off];
					ti	= currentPhaseShiftReal * imag[off] + currentPhaseShiftImag * real[off];

					real[off]	= real[i] - tr;
					imag[off]	= imag[i] - ti;
					real[i]		+= tr;
					imag[i]		+= ti;

					i += size;
				}

				tmpReal			= currentPhaseShiftReal;
				currentPhaseShiftReal	= tmpReal * phaseShiftStepReal - currentPhaseShiftImag * phaseShiftStepImag;
				currentPhaseShiftImag	= tmpReal * phaseShiftStepImag - currentPhaseShiftImag * phaseShiftStepReal;
			}

			halfSize = size;
		}

		return this.calculateSpectrum();
	},
/**
 * Performs an inverse FFT operation on the specified buffer.
 *
 * @param {Float32Array} real The real buffer to perform the operation on. (Optional)
 * @param {Float32Array} imag The imaginary buffer to perform the operation on. (Optional)
*/
	inverse: function(real, imag){
		var	self			= this,
			bufferSize		= self.bufferSize,
			reverseTable		= self.reverseTable,
			spectrum		= self.spectrum,
			halfSize		= 1,
			revReal			= new Float32Array(bufferSize),
			revImg			= new Float32Array(bufferSize),
			phaseShiftStepReal,
			phaseShiftStepImag,
			currentPhaseShiftReal,
			currentPhaseShiftImag,
			off, tr, ti, tmpReal, i, hsrad, fftStep, size;

		real	= real || self.real;
		imag	= imag || self.imag;

		for (i=0; i<bufferSize; i++){
			imag[i] *= -1;
		}

		for (i=0; i<real.length; i++){
			revReal[i] = real[reverseTable[i]];
			revImag[i] = imag[reverseTable[i]];
		}

		real	= revReal;
		imag	= revImag;

		while (halfSize < bufferSize){
			hsrad			= -Math.PI / halfSize;
			phaseShiftStepReal	= cos(hsrad);
			phaseShiftStepImag	= sin(hsrad);

			currentPhaseShiftReal	= 1;
			currentPhaseShiftImag	= 0;

			size = halfSize * 2;
			
			for (fftStep = 0; fftStep < halfSize; fftStep++){
				i = fftStep;
				while (i < bufferSize){
					off	= i + halfSize;
					tr	= currentPhaseShiftReal * real[off] + currentPhaseShiftImag * imag[off];
					ti	= currentPhaseShiftReal * imag[off] + currentPhaseShiftImag * real[off];

					real[off]	= real[i] - tr;
					imag[off]	= imag[i] - ti;
					real[i]		+= tr;
					imag[i]		+= ti;

					i += size;
				}

				tmpReal			= currentPhaseShiftReal;
				currentPhaseShiftReal	= tmpReal * phaseShiftStepReal - currentPhaseShiftImag * phaseShiftStepImag;
				currentPhaseShiftImag	= tmpReal * phaseShiftStepImag - currentPhaseShiftImag * phaseShiftStepReal;

			}
			halfSize = size;
		}

		return this.calculateSpectrum();
	},
	process: function(buffer){
		this[this.method](buffer || this.buffer);
	}
};

FourierTransform.FFT	= FFT;

return FourierTransform;
}());
/*
	wrapper-end.js
	Please note that this file is of invalid syntax if standalone.
*/

// Controls
audioLib.ADSREnvelope		= ADSREnvelope;
audioLib.StepSequencer		= StepSequencer;
audioLib.UIControl		= UIControl;


//Effects
audioLib.BiquadFilter	= BiquadFilter;
audioLib.BitCrusher	= BitCrusher;
audioLib.Chorus		= Chorus;
audioLib.CombFilter	= CombFilter;
audioLib.Compressor	= Compressor;
audioLib.Delay		= Delay;
audioLib.Distortion	= Distortion;
audioLib.GainController	= GainController;
audioLib.IIRFilter	= IIRFilter;
audioLib.LP12Filter	= LP12Filter;
audioLib.Reverb		= Freeverb;


//Geneneration
audioLib.Oscillator	= Oscillator;
audioLib.Sampler	= Sampler;


//Processing
audioLib.AudioProcessingUnit = AudioProcessingUnit;


function EffectClass(){
}

EffectClass.prototype = {
	type:	'effect',
	sink:	true,
	source:	true,
	mix:	0.5,
	join:	function(){
		return EffectChain.apply(0, [this].concat(Array.prototype.splice.call(arguments, 0)));
	},
	addPreProcessing: function(callback){
		callback.pushSample = this.pushSample;
		this.pushSample = function(){
			callback.apply(this, arguments);
			return callback.pushSample.apply(this, arguments);
		};
	},
	removePreProcessing: function(callback){
		var f;
		while (f = this.pushSample.pushSample){
			if (f === callback || !callback){
				this.pushSample		= f;
				callback.pushSample	= null;
			}
		}
	}
};

function EffectChain(){
	var	arr	= Array.prototype.splice.call(arguments, 0),
		proto	= arr.prototype = EffectChain.prototype;
	for (i in proto){
		if (proto.hasOwnProperty(i)){
			arr[i] = proto[i];
		}
	}
	return arr;
}

(function(proto){
	EffectChain.prototype = proto;
	proto.pushSample = function(sample){
		var	self	= this,
			mix,
			i;
		for (i=0; i<self.length; i++){
			mix	= self[i].mix;
			sample	= self[i].pushSample(sample) * mix + sample * (1 - mix);
		}
		return sample;
	};
}(new EffectClass()));

function BufferEffect(effect, channelCount, args){
	this.channelCount	= channelCount;
	this.effects		= [];

	function fx(){
		effect.apply(this, args);
	}
	fx.prototype = effect.prototype;

	while (channelCount--){
		this.effects.push(new fx());
	}
}

BufferEffect.prototype = {
	mix: 0.5,
	append:	function(buffer){
		var	self	= this,
			ch	= self.channelCount,
			l	= buffer.length,
			i, n;
		for (i=0; i<l; i+=ch){
			for (n=0; n<ch; n++){
				buffer[i + n] = self.effects[n].pushSample(buffer[i + n]) * self.mix + buffer[i + n] * (1 - self.mix);
			}
		}
		return buffer;
	},
	join:	function(){
		return BufferEffectChain.apply(0, [this].concat(Array.prototype.splice.call(arguments, 0)));
	},
	addPreProcessing: function(){
		var i;
		for (i=0; i<this.effects.length; i++){
			this.effects[i].addPreProcessing.apply(this.effects[i], arguments);
		}
	},
	removePreProcessing: function(){
		var i;
		for (i=0; i<this.effects.length; i++){
			this.effects[i].removePreProcessing.apply(this.effects[i], arguments);
		}
	},
	addAutomation: function(){
		return audioLib.Automation.apply(audioLib, [this].concat([].slice.call(arguments)));
	}
};


function GeneratorClass(){
}

GeneratorClass.prototype = {
	type:	'generator',
	source:	true,
	mix:	1,
	generatedBuffer: null,
	append: function(buffer, channelCount){
		var	l	= buffer.length,
			i, n;
		channelCount	= channelCount || 1;
		for (i=0; i<l; i+=channelCount){
			this.generate();
			for (n=0; n<channelCount; n++){
				buffer[i + n] = this.getMix(n) * this.mix + buffer[i + n];
			}
		}
		return buffer;
	},
	addPreProcessing: function(callback){
		callback.generate = this.generate;
		this.generate = function(){
			callback.apply(this, arguments);
			return callback.generate.apply(this, arguments);
		};
	},
	removePreProcessing: function(callback){
		var f;
		while (f = this.generate.generate){
			if (f === callback || !callback){
				this.generate		= f;
				callback.generate	= null;
			}
		}
	},
	addAutomation: function(){
		return audioLib.Automation.apply(audioLib, [this].concat([].slice.call(arguments)));
	},
	generateBuffer: function(length){
		this.generatedBuffer = new Float32Array(length);
		var i;
		for (i=0; i<length; i++){
			this.generate();
			this.generatedBuffer[i] = this.getMix();
		}
	}
};

(function(names, i){
	function createBufferBased(channelCount){
		return new audioLib.BufferEffect(this, channelCount, [].slice.call(arguments, 1));
	}

	function effects(name, effect, prototype){
		if (effect){
			prototype	= prototype || effect.prototype;
			effects[name]	= effect;
			var	proto	= effect.prototype = new EffectClass();
			proto.name	= proto.fxid = name;
			effects[name].createBufferBased = createBufferBased;
			for (name in prototype){
				if (prototype.hasOwnProperty(name)){
					proto[name] = prototype[name];
				}
			}
		}
		return effects[name];
	}



	audioLib.effects = effects;

	for (i=0; i<names.length; i++){
		effects(names[i], audioLib[names[i]], audioLib[names[i]].prototype);
	}

	effects('BiquadHighPassFilter', BiquadFilter.HighPass);
	effects('BiquadLowPassFilter', BiquadFilter.LowPass);
	effects('BiquadAllPassFilter', BiquadFilter.AllPass);
	effects('BiquadBandPassFilter', BiquadFilter.BandPass);
	effects('FFT', audioLib.FourierTransform.FFT);
	audioLib.FFT = audioLib.FourierTransform.FFT;
}(['BiquadFilter', 'BitCrusher', 'Chorus', 'CombFilter', 'Compressor', 'Delay', 'Distortion', 'GainController', 'IIRFilter', 'LP12Filter', 'Reverb']));

(function(names, i){
	function generators(name, effect, prototype){
		if (effect){
			prototype	= prototype || effect.prototype;
			generators[name]= effect;
			var	proto	= effect.prototype = new GeneratorClass();
			proto.name	= proto.fxid = name;
			for (name in prototype){
				if (prototype.hasOwnProperty(name)){
					proto[name] = prototype[name];
				}
			}
		}
		return generators[name];
	}

	audioLib.generators = generators;

	for (i=0; i<names.length; i++){
		generators(names[i], audioLib[names[i]], audioLib[names[i]].prototype);
	}
}(['Oscillator', 'Sampler', 'ADSREnvelope', 'StepSequencer', 'UIControl']));

function Codec(name, codec){
	var nameCamel = name[0].toUpperCase() + name.substr(1).toLowerCase();
	Codec[name] = codec;
	if (codec.decode){
		audioLib.Sampler.prototype['load' + nameCamel] = function(filedata){
			this.load.apply(this, [Codec[name].decode(filedata)].concat([].slice.call(arguments, 1)));
		};
	}
	if (codec.encode){
		audioLib.AudioDevice.Recording.prototype['to' + nameCamel] = function(bytesPerSample){
			return Codec[name].encode({
				data:		this.join(),
				sampleRate:	this.boundTo.sampleRate,
				channelCount:	this.boundTo.channelCount,
				bytesPerSample:	bytesPerSample
			});
		};
	}
	return codec;
}

Codec('wav', audioLib.PCMData);

function Plugin(name, plugin){
	Plugin[name] = plugin;
	Plugin._pluginList.push({
		plugin: plugin,
		name:	name
	});
}

__defineConst(Plugin, '_pluginList', [], false);

function Automation(fx, parameter, automation, amount, type){
	if (!fx.automation){
		fx.automation = [];
		if (fx.type === 'generator'){
			fx.append = Automation.generatorAppend;
		} else {
			fx.append = Automation.effectAppend;
		}
	}
	var automation = {
		parameter:	parameter,
		automation:	automation,
		amount:		isNaN(amount) ? 1 : amount,
		type:		type || 'modulation'
	};
	fx.automation.push(automation);
	return automation;
}

Automation.generatorAppend = function(buffer, channelCount){
	var	self	= this,
		l	= buffer.length,
		k	= self.automation.length,
		def	= [],
		i, n, m, a;
	channelCount	= channelCount || 1;
	for (m=0; m<k; m++){
		def.push(self[self.automation[m].parameter]);
	}
	for (i=0; i<l; i+=channelCount){
		for (m=0; m<k; m++){
			self[self.automation[m].parameter] = def[m];
		}
		for (m=0; m<k; m++){
			a = self.automation[m];
			switch(a.type){
				case 'modulation':
					self[a.parameter] *= a.amount * a.automation.generatedBuffer[i];
					break;
				case 'addition':
					self[a.parameter] += a.amount * a.automation.generatedBuffer[i];
					break;
				case 'substraction':
					self[a.parameter] -= a.amount * a.automation.generatedBuffer[i];
					break;
				case 'additiveModulation':
					self[a.parameter] += self[a.parameter] * a.amount * a.automation.generatedBuffer[i];
					break;
				case 'substractiveModulation':
					self[a.parameter] -= self[a.parameter] * a.amount * a.automation.generatedBuffer[i];
					break;
				case 'assignment':
					self[a.parameter] = a.amount * a.automation.generatedBuffer[i];
					break;
				case 'absoluteAssignment':
					self[a.parameter] = Math.abs(a.amount * a.automation.generatedBuffer[i]);
					break;
			}
		}

		self.generate();

		for (n=0; n<channelCount; n++){
			buffer[i + n] = self.getMix(n) * self.mix + buffer[i + n];
		}
	}
	for (m=0; m<k; m++){
		self[self.automation[m].parameter] = def[m];
	}
	return buffer;
}
Automation.effectAppend = function(buffer){
	var	self	= this,
		ch	= self.channelCount,
		l	= buffer.length,
		k	= self.automation.length,
		def	= [],
		i, n, m, z, a;
	for (m=0; m<k; m++){
		def.push([]);
		for (n=0; n<ch; n++){
			def[m].push(self.effects[n][self.automation[m].parameter]);
		}
	}
	for (i=0; i<l; i+=ch){
		for (n=0; n<ch; n++){
			for (m=0; m<k; m++){
				a = self.automation[m];
				self.effects[n][a.parameter] = def[m][n];
				switch(a.type){
					case 'modulation':
						self.effects[n][a.parameter] *= a.amount * a.automation.generatedBuffer[i];
						break;
					case 'addition':
						self.effects[n][a.parameter] += a.amount * a.automation.generatedBuffer[i];
						break;
					case 'substraction':
						self.effects[n][a.parameter] -= a.amount * a.automation.generatedBuffer[i];
						break;
					case 'additiveModulation':
						self.effects[n][a.parameter] += self.effects[n][a.parameter] * a.amount * a.automation.generatedBuffer[i];
						break;
					case 'substractiveModulation':
						self.effects[n][a.parameter] -= self.effects[n][a.parameter] * a.amount * a.automation.generatedBuffer[i];
						break;
					case 'assignment':
						self.effects[n][a.parameter] = a.amount * a.automation.generatedBuffer[i];
						break;
					case 'absoluteAssignment':
						self.effects[n][a.parameter] = Math.abs(a.amount * a.automation.generatedBuffer[i]);
						break;
				}
			}
			buffer[i + n] = self.effects[n].pushSample(buffer[i + n]) * self.mix + buffer[i + n] * (1 - self.mix);
		}
	}
	for (m=0; m<k; m++){
		for (n=0; n<ch; n++){
			self.effects[n][self.automation[m].parameter] = def[m][n];
		}
	}
	return buffer;
}

audioLib.Automation	= Automation;

audioLib.EffectChain	= EffectChain;
audioLib.EffectClass	= EffectClass;
audioLib.BufferEffect	= BufferEffect;
audioLib.GeneratorClass	= GeneratorClass;
audioLib.codecs		= audioLib.Codec = Codec;
audioLib.plugins	= Plugin;

audioLib.version	= '0.4.7';

return audioLib;
}).call(typeof exports === 'undefined' ? {} : this, this.window || global, Math, Object, Array);
