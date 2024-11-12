import JSZip from "jszip";

import type { UploadedFile } from "@/types/uploaded-file";

export async function createZipFromFiles(files: UploadedFile[]): Promise<Blob> {
	if (files.some((file) => !file.convertedBlob)) {
		throw new Error("Some files are not converted yet.");
	}

	const zip = new JSZip();
	files.forEach((uploadedFile) => {
		const fileNameParts = uploadedFile.file.name.split(".");
		fileNameParts.pop();
		const newFileName = `${fileNameParts.join(".") || "converted"}.wav`;
		zip.file(newFileName, uploadedFile.convertedBlob as Blob);
	});

	return zip.generateAsync({ type: "blob" });
}

function writeString(view: DataView, offset: number, str: string) {
	for (let i = 0; i < str.length; i++) {
		view.setUint8(offset + i, str.charCodeAt(i));
	}
}

function encodeWav(audioBuffer: AudioBuffer): ArrayBuffer {
	const numOfChan = audioBuffer.numberOfChannels;
	const length = audioBuffer.length * numOfChan * 2 + 44;
	const buffer = new ArrayBuffer(length);
	const view = new DataView(buffer);

	/* RIFF identifier */
	writeString(view, 0, "RIFF");
	/* file length */
	view.setUint32(4, 36 + audioBuffer.length * numOfChan * 2, true);
	/* RIFF type */
	writeString(view, 8, "WAVE");
	/* format chunk identifier */
	writeString(view, 12, "fmt ");
	/* format chunk length */
	view.setUint32(16, 16, true);
	/* sample format (raw) */
	view.setUint16(20, 1, true);
	/* channel count */
	view.setUint16(22, numOfChan, true);
	/* sample rate */
	view.setUint32(24, audioBuffer.sampleRate, true);
	/* byte rate (sample rate * block align) */
	view.setUint32(28, audioBuffer.sampleRate * numOfChan * 2, true);
	/* block align (channel count * bytes per sample) */
	view.setUint16(32, numOfChan * 2, true);
	/* bits per sample */
	view.setUint16(34, 16, true);
	/* data chunk identifier */
	writeString(view, 36, "data");
	/* data chunk length */
	view.setUint32(40, audioBuffer.length * numOfChan * 2, true);

	// Write interleaved PCM samples
	let offset = 44;
	for (let i = 0; i < audioBuffer.length; i++) {
		for (let channel = 0; channel < numOfChan; channel++) {
			// Clamp the sample
			let sample = audioBuffer.getChannelData(channel)[i];
			sample = Math.max(-1, Math.min(1, sample));
			// Scale to 16-bit integer
			sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
			view.setInt16(offset, sample, true);
			offset += 2;
		}
	}

	return buffer;
}

export async function convertToWav(file: File): Promise<Blob> {
	const arrayBuffer = await file.arrayBuffer();
	const audioContext = new (
		window.AudioContext || (window as any).webkitAudioContext
	)();
	const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
	const wavBuffer = encodeWav(audioBuffer);
	return new Blob([wavBuffer], { type: "audio/wav" });
}

export function getSupportedAudioFormats(): string[] {
	const audio = document.createElement("audio");
	const formats: { [key: string]: string } = {
		"audio/mp3": "mp3",
		"audio/wav": "wav",
		"audio/ogg": "ogg",
		"audio/flac": "flac",
		"audio/aac": "aac",
	};
	return Object.keys(formats).filter((mime) => {
		const canPlay = audio.canPlayType(mime as any);
		console.log("canPlay", canPlay);
		return canPlay === "probably" || canPlay === "maybe";
	});
}
