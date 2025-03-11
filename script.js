function setButtonClickHandler() {
    let mode = document.getElementById(`mode`).value;
    document.getElementById(`button`).onclick = function() {
        let text = document.getElementById(`input`).value.trimEnd();
        text = text.split('\n').map(line => line.trimStart().replace(/\s+/g, ' ')).join('\n');
        let lines = text.split('\n');
        let quotedLines = lines.map(line => {
            if (mode === 'phrase') {
                return `"${line}"`;
            } else if (mode === 'exact') {
                return `[${line}]`;
            } else {
                return line;
            }
        });
        let result = quotedLines.filter(line => line !== '""' && line !== '[]' && line.trim() !== '').join('\n');
        document.getElementById(`result`).textContent = result;
    }
}

document.getElementById(`mode`).onchange = setButtonClickHandler;
setButtonClickHandler();

document.getElementById(`copy`).onclick = function() {
    let result = document.getElementById(`result`);
    result.select();
    document.execCommand(`copy`);
}
