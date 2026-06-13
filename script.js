let animationFrameId = null;
let startTime = 0;
let elapsedTime = 0;
let running = false;
let lastLapTime = 0;
let laps = [];

// Web Audio API Context
let audioCtx = null;

/**
 * Synthesizes dynamic click and chime sounds using Web Audio API oscillators.
 * @param {string} type - The sound action type ('start', 'pause', 'lap', 'reset', 'click')
 */
function playActionSound(type) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        const now = audioCtx.currentTime;
        
        if (type === 'start') {
            // High upward digital sweep
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'pause') {
            // Lower warning slide
            osc.type = 'sine';
            osc.frequency.setValueAtTime(950, now);
            osc.frequency.exponentialRampToValueAtTime(550, now + 0.1);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (type === 'lap') {
            // Quick sharp double chime
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1300, now);
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            osc.start(now);
            osc.stop(now + 0.04);
            
            // Second tone
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(1600, now + 0.04);
            gain2.gain.setValueAtTime(0.04, now + 0.04);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.start(now + 0.04);
            osc2.stop(now + 0.09);
        } else if (type === 'reset') {
            // Deep retro slide down
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(350, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else {
            // Short mechanical click
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1000, now);
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            osc.start(now);
            osc.stop(now + 0.04);
        }
    } catch (e) {
        console.warn("Web Audio API not allowed or supported on this device/interaction.", e);
    }
}

/**
 * Parses elapsed milliseconds into readable parts.
 * @param {number} totalMs 
 * @returns {object} { timeString: "hh:mm:ss", msString: ".ms" }
 */
function formatTimeParts(totalMs) {
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const ms = Math.floor((totalMs % 1000) / 10);
    
    const hStr = String(hours).padStart(2, '0');
    const mStr = String(minutes).padStart(2, '0');
    const sStr = String(seconds).padStart(2, '0');
    const msStr = String(ms).padStart(2, '0');
    
    return {
        timeString: `${hStr}:${mStr}:${sStr}`,
        msString: `.${msStr}`
    };
}

/**
 * Updates the digital display nodes and the SVG circular visualizer.
 * @param {number} currentElapsed 
 */
function updateDisplay(currentElapsed) {
    const parts = formatTimeParts(currentElapsed);
    document.getElementById('display-time').innerText = parts.timeString;
    document.getElementById('display-ms').innerText = parts.msString;
    
    // SVG circular sweep logic
    const progressCircle = document.getElementById('progress-circle');
    if (progressCircle) {
        // Read radius from SVG (respecting CSS responsive dimensions)
        const radius = progressCircle.r.baseVal.value;
        const circumference = 2 * Math.PI * radius;
        progressCircle.style.strokeDasharray = circumference;
        
        // A complete sweep takes 60 seconds (analog minute clock hand)
        const secondsElapsed = (currentElapsed % 60000) / 1000;
        const fraction = secondsElapsed / 60;
        const offset = circumference - (fraction * circumference);
        progressCircle.style.strokeDashoffset = offset;
    }
}

/**
 * Changes status badge labels.
 * @param {string} state - 'ready' | 'running' | 'paused'
 */
function updateStatus(state) {
    const statusBadge = document.getElementById('status');
    statusBadge.className = 'status-badge'; // Clear existing state classes
    
    if (state === 'ready') {
        statusBadge.innerText = 'READY';
        statusBadge.classList.add('status-ready');
    } else if (state === 'running') {
        statusBadge.innerText = 'RUNNING';
        statusBadge.classList.add('status-running');
    } else if (state === 'paused') {
        statusBadge.innerText = 'PAUSED';
        statusBadge.classList.add('status-paused');
    }
}

/**
 * Main animation loop running on requestAnimationFrame.
 */
function tick() {
    if (!running) return;
    
    const currentElapsed = elapsedTime + (Date.now() - startTime);
    updateDisplay(currentElapsed);
    
    animationFrameId = requestAnimationFrame(tick);
}

/**
 * Starts the stopwatch.
 */
function start() {
    if (running) return;
    
    playActionSound('start');
    running = true;
    startTime = Date.now();
    
    updateStatus('running');
    
    // Toggle Button Visibilities
    document.getElementById('btn-start').style.display = 'none';
    document.getElementById('btn-pause').style.display = 'inline-flex';
    document.getElementById('btn-reset').disabled = true;
    document.getElementById('btn-lap').disabled = false;
    
    document.getElementById('display').className = 'running';
    
    animationFrameId = requestAnimationFrame(tick);
}

/**
 * Pauses the stopwatch.
 */
function pause() {
    if (!running) return;
    
    playActionSound('pause');
    running = false;
    elapsedTime += Date.now() - startTime;
    
    cancelAnimationFrame(animationFrameId);
    
    updateStatus('paused');
    
    // Toggle Button Visibilities
    document.getElementById('btn-start').style.display = 'inline-flex';
    document.getElementById('btn-pause').style.display = 'none';
    document.getElementById('btn-reset').disabled = false;
    document.getElementById('btn-lap').disabled = true;
    
    document.getElementById('display').className = 'paused';
}

/**
 * Resets stopwatch to initial conditions.
 */
function reset() {
    if (running) return;
    
    playActionSound('reset');
    elapsedTime = 0;
    lastLapTime = 0;
    laps = [];
    
    cancelAnimationFrame(animationFrameId);
    updateDisplay(0);
    updateStatus('ready');
    
    // Reset controls
    document.getElementById('btn-start').style.display = 'inline-flex';
    document.getElementById('btn-pause').style.display = 'none';
    document.getElementById('btn-reset').disabled = true;
    document.getElementById('btn-lap').disabled = true;
    
    document.getElementById('display').className = '';
    
    updateLapsUI();
}

/**
 * Records current split time.
 */
function lap() {
    if (!running) return;
    
    playActionSound('lap');
    
    const currentElapsed = elapsedTime + (Date.now() - startTime);
    const lapDuration = currentElapsed - lastLapTime;
    lastLapTime = currentElapsed;
    
    laps.push({
        index: laps.length + 1,
        duration: lapDuration,
        cumulative: currentElapsed
    });
    
    updateLapsUI();
}

/**
 * Re-renders laps table UI with speed highlights (fastest/slowest).
 */
function updateLapsUI() {
    const noLapsMsg = document.getElementById('no-laps-msg');
    const lapsTable = document.getElementById('laps-table');
    const btnExport = document.getElementById('btn-export');
    const lapsContainer = document.getElementById('laps');
    const lapCountBadge = document.getElementById('lap-count');
    
    lapCountBadge.innerText = laps.length;
    
    if (laps.length === 0) {
        noLapsMsg.style.display = 'flex';
        lapsTable.style.display = 'none';
        btnExport.style.display = 'none';
        lapsContainer.innerHTML = '';
        return;
    }
    
    noLapsMsg.style.display = 'none';
    lapsTable.style.display = 'table';
    btnExport.style.display = 'inline-flex';
    
    // Find min and max durations to highlight if we have 2 or more laps
    let minDuration = Infinity;
    let maxDuration = -Infinity;
    
    if (laps.length >= 2) {
        laps.forEach(l => {
            if (l.duration < minDuration) minDuration = l.duration;
            if (l.duration > maxDuration) maxDuration = l.duration;
        });
    }
    
    lapsContainer.innerHTML = '';
    
    // Render in reverse order (newest lap on top) for optimal tracking
    const renderedLaps = [...laps].reverse();
    
    renderedLaps.forEach(lap => {
        const isFastest = laps.length >= 2 && lap.duration === minDuration;
        const isSlowest = laps.length >= 2 && lap.duration === maxDuration;
        
        const row = document.createElement('tr');
        if (isFastest) row.className = 'lap-row-fastest';
        if (isSlowest) row.className = 'lap-row-slowest';
        
        const durationParts = formatTimeParts(lap.duration);
        const cumulativeParts = formatTimeParts(lap.cumulative);
        
        let badgeHTML = '';
        if (isFastest) badgeHTML = ' <span class="lap-badge">Fastest</span>';
        if (isSlowest) badgeHTML = ' <span class="lap-badge">Slowest</span>';
        
        row.innerHTML = `
            <td class="lap-num-cell">Lap ${lap.index}${badgeHTML}</td>
            <td class="lap-time-cell">${durationParts.timeString}${durationParts.msString}</td>
            <td class="lap-cumulative-cell">${cumulativeParts.timeString}${cumulativeParts.msString}</td>
        `;
        
        lapsContainer.appendChild(row);
    });
}

/**
 * Compiles lap data and downloads it as a CSV.
 */
function exportLaps() {
    if (laps.length === 0) return;
    
    playActionSound('click');
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Lap,Lap Time,Cumulative Time\r\n";
    
    laps.forEach(lap => {
        const d = formatTimeParts(lap.duration);
        const c = formatTimeParts(lap.cumulative);
        const durationStr = `${d.timeString}${d.msString}`;
        const cumulativeStr = `${c.timeString}${c.msString}`;
        csvContent += `${lap.index},${durationStr},${cumulativeStr}\r\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `chronoflow_laps_${Date.now()}.csv`);
    document.body.appendChild(link);
    
    link.click();
    document.body.removeChild(link);
}

// Keyboard Listeners
window.addEventListener('keydown', (e) => {
    // Avoid triggering shortcuts if input focuses (preventing bad keyboard trap behaviors)
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    const key = e.key.toLowerCase();
    
    if (key === ' ') {
        e.preventDefault(); // Stop window space scroll
        if (running) {
            pause();
        } else {
            start();
        }
    } else if (key === 'l') {
        if (running) {
            lap();
        }
    } else if (key === 'r') {
        if (!running && elapsedTime > 0) {
            reset();
        }
    }
});

// Run initial UI state
updateDisplay(0);
updateStatus('ready');