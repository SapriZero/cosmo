// ui/VideoRecorder.js

export class VideoRecorder {
    constructor(rendererDomElement, ui, currentNGetter) {
        this.rendererDomElement = rendererDomElement;
        this.ui = ui;
        this.currentNGetter = currentNGetter;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
    }

    startRecording() {
        if (this.isRecording) return;
        this.recordedChunks = [];
        const stream = this.rendererDomElement.captureStream(30);
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
        this.mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) this.recordedChunks.push(event.data);
        };
        this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `n-body-${this.currentNGetter()}-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.webm`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            this.isRecording = false;
            this.ui.recordBtn.textContent = '⏺️ Record Video';
        };
        this.mediaRecorder.start();
        this.isRecording = true;
        this.ui.recordBtn.textContent = '⏹️ Stop Recording';
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
        }
    }

    isCurrentlyRecording() {
        return this.isRecording;
    }
}
