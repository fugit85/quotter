document.getElementById(`button`).onclick = function() {
    let text = document.getElementById(`input`).value.trimEnd();
    let lines = text.split('\n');
    let quotedLines = lines.map(line => `"${line}"`);
    let result = quotedLines.map(line => line === '""' ? '' : line).join('\n');
    document.getElementById(`result`).textContent = result;
}

document.getElementById(`copy`).onclick = function() {
    let result = document.getElementById(`result`);
    result.select();
    document.execCommand(`copy`);
    alert(`Copied to clipboard!`);
}
