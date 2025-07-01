let mediaRecorder;
let recordedChunks = [];
let recordedBlob = null;
let audios = []; // {id, name, file, url, result}

const recordBtn = document.getElementById('record-btn');
const recordStatus = document.getElementById('record-status');
const dropArea = document.getElementById('drop-area');
const audioInput = document.getElementById('audio-input');
const plusBtn = document.getElementById('plus-btn');
const audioListDiv = document.getElementById('audio-list');

// --- ENREGISTREMENT AUDIO VIA MICRO ---
recordBtn.addEventListener('click', async function() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        recordBtn.textContent = "🎤 Enregistrer";
        recordStatus.textContent = "Traitement de l'audio...";
    } else {
        recordedChunks = [];
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();
            recordBtn.textContent = "⏹️ Arrêter";
            recordStatus.textContent = "Enregistrement en cours...";
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) recordedChunks.push(e.data);
            };
            mediaRecorder.onstop = () => {
                recordStatus.textContent = "Enregistrement terminé.";
                recordedBlob = new Blob(recordedChunks, { type: 'audio/webm' });
                const uniqueId = "rec_" + Date.now() + "_" + Math.floor(Math.random()*10000);
                const name = "Enregistrement - " + uniqueId.slice(-6);
                const file = new File([recordedBlob], name + ".webm", { type: 'audio/webm' });
                const url = URL.createObjectURL(recordedBlob);
                audios.push({ id: uniqueId, name, file, url, result: "" });
                updateAudioList();
            };
        } catch (err) {
            alert("Impossible d'accéder au micro : " + err);
            recordStatus.textContent = "";
        }
    }
});

// --- DRAG & DROP / CLICK POUR CHOISIR ---
dropArea.addEventListener('click', (e) => {
    if (e.target === plusBtn) return;
    audioInput.click();
});
plusBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    audioInput.click();
});
dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('dragover');
});
dropArea.addEventListener('dragleave', () => dropArea.classList.remove('dragover'));
dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});
audioInput.addEventListener('change', () => {
    handleFiles(audioInput.files);
});
function handleFiles(fileList) {
    if (fileList && fileList[0]) {
        Array.from(fileList).forEach(file => {
            const uniqueId = "file_" + Date.now() + "_" + Math.floor(Math.random()*10000);
            const name = file.name || ("Audio " + uniqueId.slice(-6));
            const url = URL.createObjectURL(file);
            audios.push({ id: uniqueId, name, file, url, result: "" });
        });
        updateAudioList();
    }
}

// --- AFFICHAGE ET INTERACTION LISTE AUDIOS (ligne à ligne, sans bordure, stylée) ---
function updateAudioList() {
    audioListDiv.innerHTML = '';
    audios.forEach(audio => {
        const item = document.createElement('div');
        item.className = 'audio-item styled-audio-item';

        // Nom/id
        const nameEl = document.createElement('span');
        nameEl.className = 'audio-name styled-audio-name';
        nameEl.textContent = audio.name;

        // Lecteur
        const audioEl = document.createElement('audio');
        audioEl.src = audio.url;
        audioEl.controls = true;
        audioEl.className = 'styled-audio-player';

        // Play
        const playBtn = document.createElement('button');
        playBtn.className = 'audio-action-btn play styled-btn styled-btn-play';
        playBtn.textContent = '▶️';
        playBtn.title = "Envoyer au serveur et écouter";

        // Résultat
        const resultEl = document.createElement('span');
        resultEl.className = 'result-text styled-result-text';
        resultEl.textContent = audio.result ? "Résultat : " + audio.result : "";

        // Nouveau comportement du bouton Play
        playBtn.onclick = async () => {
            playBtn.disabled = true;
            resultEl.textContent = "Traitement...";
            const formData = new FormData();
            formData.append('audio', audio.file);
            formData.append('name', audio.name);

            try {
                const response = await fetch('/api/recognize', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.speaker) {
                    resultEl.textContent = "Résultat : " + data.speaker;
                    audio.result = data.speaker;
                } else {
                    resultEl.textContent = "Erreur : " + data.error;
                    audio.result = "";
                }
                audioEl.play();
            } catch (err) {
                resultEl.textContent = "Erreur lors de l'envoi.";
                audio.result = "";
            }
            playBtn.disabled = false;
        };

        // Envoyer
        const sendBtn = document.createElement('button');
        sendBtn.className = 'audio-action-btn send styled-btn styled-btn-send';
        sendBtn.textContent = 'Envoyer';
        sendBtn.title = "Envoyer au serveur";
        sendBtn.onclick = () => sendAudioToBackend(audio.id, item);

        // Supprimer
        const delBtn = document.createElement('button');
        delBtn.className = 'audio-action-btn delete styled-btn styled-btn-delete';
        delBtn.textContent = '🗑️';
        delBtn.title = "Supprimer";
        delBtn.onclick = () => removeAudio(audio.id);

        item.appendChild(nameEl);
        item.appendChild(audioEl);
        item.appendChild(playBtn);
        item.appendChild(sendBtn);
        item.appendChild(delBtn);
        item.appendChild(resultEl);

        audioListDiv.appendChild(item);
    });
}

// --- ENVOI VERS FLASK POUR TRAITEMENT ---
async function sendAudioToBackend(audioId, domItem) {
    const audio = audios.find(a => a.id === audioId);
    if (!audio) return;
    const resultEl = domItem.querySelector('.result-text');
    
    // Affiche le spinner
    resultEl.innerHTML = `<span class="loading-spinner"></span> Traitement...`;
    const formData = new FormData();
    formData.append('audio', audio.file);
    formData.append('name', audio.name);

    try {
        const response = await fetch('/api/recognize', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        // Retire le spinner et affiche le résultat
        if (data.speaker) {
            resultEl.innerHTML = "Résultat : " + data.speaker;
            audio.result = data.speaker;
        } else {
            resultEl.innerHTML = "Erreur : " + data.error;
            audio.result = "";
        }
    } catch (err) {
        resultEl.innerHTML = "Erreur lors de l'envoi.";
        audio.result = "";
    }
}

// --- SUPPRIMER UN AUDIO DE LA LISTE ---
function removeAudio(audioId) {
    const audio = audios.find(a => a.id === audioId);
    if (audio && audio.url) URL.revokeObjectURL(audio.url);
    audios = audios.filter(a => a.id !== audioId);
    updateAudioList();
}