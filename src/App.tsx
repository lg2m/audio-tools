import { ChangeEvent, useEffect, useState } from "react";
import { Download, FileAudio, Loader2, Trash2 } from "lucide-react";

import {
	convertToWav,
	getSupportedAudioFormats,
	createZipFromFiles,
} from "@/lib/file-utils";

import type { UploadedFile } from "@/types/uploaded-file";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function App() {
	const [supportedFormats, setSupportedFormats] = useState<string[]>([]);
	const [files, setFiles] = useState<UploadedFile[]>([]);
	const [converting, setConverting] = useState(false);
	const [converted, setConverted] = useState(false);

	useEffect(() => {
		const formats = getSupportedAudioFormats();
		console.log(formats);
		setSupportedFormats(formats);
	}, []);

	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		if (event.target.files) {
			const selectedFiles: UploadedFile[] = Array.from(event.target.files).map(
				(file) => ({
					file,
					convertedBlob: undefined,
				}),
			);
			setFiles(selectedFiles);
			setConverted(false);
		}
	};

	const handleRemoveFile = (index: number) => {
		setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
		setConverted(false);
	};

	const handleConvert = async () => {
		if (files.length === 0) {
			console.error("No file(s) selected");
			return;
		}

		setConverting(true);

		try {
			const convertedFiles: UploadedFile[] = await Promise.all(
				files.map(async (uploadedFile) => {
					const blob = await convertToWav(uploadedFile.file);
					return { ...uploadedFile, convertedBlob: blob };
				}),
			);
			setFiles(convertedFiles);
			setConverted(true);
		} catch (err) {
			console.error("Failed to convert files. Please try again.");
		} finally {
			setConverting(false);
		}
	};

	const handleDownload = (uploadedFile: UploadedFile) => {
		if (!uploadedFile.convertedBlob) return;

		const url = URL.createObjectURL(uploadedFile.convertedBlob);
		const a = document.createElement("a");
		a.style.display = "none";
		a.href = url;

		const fileNameParts = uploadedFile.file.name.split(".");
		fileNameParts.pop(); // Remove original extension
		const newFileName = `${fileNameParts.join(".") || "converted"}.wav`;
		a.download = newFileName;

		document.body.appendChild(a);
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleDownloadAll = async () => {
		try {
			const zipBlob = await createZipFromFiles(files);
			const url = URL.createObjectURL(zipBlob);
			const a = document.createElement("a");
			a.style.display = "none";
			a.href = url;
			a.download = "converted_files.zip";
			document.body.appendChild(a);
			a.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Failed to convert files. Please try again.");
		}
	};

	return (
		<main className="min-h-screen bg-background flex flex-col items-center justify-center p-24">
			<div className="container mx-auto p-4 max-w-2xl">
				<h1 className="text-2xl font-bold mb-4">Audio File Converter</h1>

				<div className="mb-4">
					<Label htmlFor="audio-files">Upload Audio Files</Label>
					<Input
						id="audio-files"
						type="file"
						accept={supportedFormats
							.map((f) => `.${f.split("/")[1]}`)
							.join(",")}
						// accept=".wav, .mp3"
						multiple
						onChange={handleFileChange}
					/>
				</div>

				{files.length > 0 && (
					<Card className="mb-4">
						<CardContent className="pt-6">
							<h2 className="text-lg font-semibold mb-2">Uploaded Files</h2>
							<ul className="space-y-2">
								{files.map((uploadedFile, index) => (
									<li key={index} className="flex justify-between items-center">
										<div className="flex items-center">
											<FileAudio className="mr-2" size={20} />
											<span>{uploadedFile.file.name}</span>
										</div>
										{converted && uploadedFile.convertedBlob ? (
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleDownload(uploadedFile)}
											>
												<Download size={20} />
											</Button>
										) : (
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleRemoveFile(index)}
											>
												<Trash2 size={20} />
											</Button>
										)}
									</li>
								))}
							</ul>
						</CardContent>
					</Card>
				)}

				<Button
					onClick={handleConvert}
					disabled={files.length === 0 || converting}
					className="w-full mb-4"
				>
					{converting ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Converting
						</>
					) : (
						"Convert"
					)}
				</Button>

				{converted && (
					<Button
						variant="outline"
						className="w-full"
						onClick={handleDownloadAll}
					>
						Download All
					</Button>
				)}
			</div>
		</main>
	);
}

export default App;
