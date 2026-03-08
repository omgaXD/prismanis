import { Flavor } from ".";

let currentPlaying: { stop: () => void } | null = null;

export function play(freq: number, flavor: Flavor) {
	stop();

	const context = new AudioContext();
	const gainNode = context.createGain();

	const oscillators = [] as OscillatorNode[];

    if (flavor === "sine") {
        oscillators.push(addOscillator(context, freq));
    } else if (flavor === "piano") {
        const overtones: { multiplier: number; gain: number }[] = [
            { multiplier: 1, gain: 1 },
            { multiplier: 2, gain: 0.5 },
            { multiplier: 3, gain: 0.25 },
            { multiplier: 4, gain: 0.125 },
        ];
        for (const overtone of overtones) {
            const osc = addOscillator(context, freq * overtone.multiplier);
            const overtoneGain = context.createGain();
            overtoneGain.gain.setValueAtTime(overtone.gain, context.currentTime);
            osc.connect(overtoneGain);
            overtoneGain.connect(gainNode);
            oscillators.push(osc);
        }
    }

    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.01, context.currentTime + 2);   

	oscillators.forEach((osc) => {osc.connect(gainNode)});
	gainNode.connect(context.destination);

	oscillators.forEach((osc) => osc.start());

	currentPlaying = {
		stop: () => {
			oscillators.forEach((osc) => osc.stop());
			context.close();
		},
	};
}

function addOscillator(context: AudioContext, freq: number) {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(freq, context.currentTime);
    return oscillator;
}

export function stop() {
	if (currentPlaying) {
		currentPlaying.stop();
		currentPlaying = null;
	}
}
