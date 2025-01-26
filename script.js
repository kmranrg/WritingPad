// script.js

// DOM Elements
const editor = document.getElementById("editor");
const fileInput = document.getElementById("fileInput");
const filenameInput = document.getElementById("filenameInput");
const devPopover = document.getElementById("devPopover");
const developerBtn = document.getElementById("developerBtn");

// Track unsaved changes
let isModified = false;
// Keep track of the current file name shown in <input>
let currentFilename = "untitled.txt";

// Check if browser supports File System Access API
const supportsFileSystemAPI = (
  "showOpenFilePicker" in window &&
  "showSaveFilePicker" in window
);

// A handle if user opened a file via File System Access
let fileHandle = null;

// =================== BASIC SETUP & EVENTS =================== //

// Mark the document as modified whenever user types in the editor
editor.addEventListener("input", () => {
  isModified = true;
});

// Warn user about unsaved changes if they close/refresh
window.addEventListener("beforeunload", (e) => {
  if (isModified) {
    e.preventDefault();
    e.returnValue = "";
  }
});

// Update `currentFilename` whenever user types in the filename <input>
filenameInput.addEventListener("input", () => {
  currentFilename = filenameInput.value.trim() || "untitled.txt";
});

// Keyboard shortcuts: Ctrl+N, Ctrl+O, Ctrl+S
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
    switch (e.key.toLowerCase()) {
      case "n": e.preventDefault(); newFile(); break;
      case "o": e.preventDefault(); openFile(); break;
      case "s": e.preventDefault(); saveFile(); break;
      default: break;
    }
  }
});

// =================== CORE FUNCTIONS =================== //

/**
 * Create a new blank file. Prompt if unsaved changes exist.
 */
function newFile() {
  if (isModified) {
    const confirmDiscard = confirm(
      "You have unsaved changes. Discard them and create a new file?"
    );
    if (!confirmDiscard) return;
  }

  editor.value = "";
  isModified = false;
  fileHandle = null;

  currentFilename = "untitled.txt";
  filenameInput.value = currentFilename;
}

/**
 * Open a file. If File System Access API is supported, open that way.
 * Otherwise, fallback to hidden <input type="file" />.
 */
function openFile() {
  if (isModified) {
    const confirmDiscard = confirm("You have unsaved changes. Discard them and open a file?");
    if (!confirmDiscard) return;
  }

  if (supportsFileSystemAPI) {
    openFileSystemFile();
  } else {
    fallbackOpenFile();
  }
}

/**
 * Save a file. If File System Access API is supported and we have a handle, 
 * overwrite it. Otherwise, do "Save As" or fallback download.
 */
function saveFile() {
  if (supportsFileSystemAPI) {
    if (fileHandle) {
      overwriteFileSystemFile();
    } else {
      saveAsNewFileSystemFile();
    }
  } else {
    fallbackSaveFile();
  }
}

// =================== FILE SYSTEM ACCESS API APPROACH =================== //

/**
 * 1) Prompt user to pick a file with showOpenFilePicker().
 */
async function openFileSystemFile() {
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [
        {
          description: "Text Files",
          accept: { "text/plain": [".txt"] },
        },
      ],
      multiple: false,
    });

    fileHandle = handle;
    const fileData = await fileHandle.getFile();
    const text = await fileData.text();

    // Load text into editor
    editor.value = text;
    isModified = false;

    // Set filename from the actual file
    currentFilename = fileHandle.name || "untitled.txt";
    filenameInput.value = currentFilename;
  } catch (err) {
    console.error("Error opening file:", err);
    // user might have canceled
  }
}

/**
 * 2) "Save As" logic if no file handle is open.
 */
async function saveAsNewFileSystemFile() {
  try {
    fileHandle = await window.showSaveFilePicker({
      suggestedName: currentFilename || "untitled.txt",
      types: [
        {
          description: "Text Files",
          accept: { "text/plain": [".txt"] },
        },
      ],
    });
    await overwriteFileSystemFile();
  } catch (err) {
    console.error("Error in saveAsNewFileSystemFile:", err);
  }
}

/**
 * 3) Overwrite an existing file handle in place.
 */
async function overwriteFileSystemFile() {
  if (!fileHandle) {
    return saveAsNewFileSystemFile();
  }
  try {
    const writable = await fileHandle.createWritable();
    await writable.write(editor.value);
    await writable.close();
    isModified = false;
    console.log("File overwritten successfully!");
  } catch (err) {
    console.error("Error overwriting file:", err);
  }
}

// =================== FALLBACK (OLD) APPROACH =================== //

/**
 * Fallback open with <input type="file" />
 */
function fallbackOpenFile() {
  fileInput.value = "";
  fileInput.click();
}

/**
 * Called when user selects a file via fallback approach.
 */
function handleFileOpen(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    editor.value = e.target.result;
    isModified = false;
    fileHandle = null; // no handle in fallback mode

    currentFilename = file.name || "untitled.txt";
    filenameInput.value = currentFilename;
  };
  reader.readAsText(file);
}

/**
 * Fallback save: download a new file with a Blob.
 */
function fallbackSaveFile() {
  const chosenName = filenameInput.value.trim() || "untitled.txt";
  const content = editor.value;

  const blob = new Blob([content], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = chosenName;
  document.body.appendChild(link);
  link.style.display = "none";
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);

  isModified = false;
  console.log(`Fallback saved as "${chosenName}"`);
}

// =================== DRAG & DROP =================== //
editor.addEventListener("dragover", (e) => {
  e.preventDefault();
  editor.classList.add("drag-hover");
});
editor.addEventListener("dragleave", () => {
  editor.classList.remove("drag-hover");
});
editor.addEventListener("drop", (e) => {
  e.preventDefault();
  editor.classList.remove("drag-hover");

  const files = e.dataTransfer.files;
  if (files && files.length > 0) {
    handleDroppedFile(files[0]);
  }
});

/**
 * Read a dragged file, set text in editor, reset old handle, 
 * and set the new file's name in <input>.
 */
function handleDroppedFile(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    editor.value = event.target.result;
    isModified = false;
    fileHandle = null; // no direct handle for drag & drop

    currentFilename = file.name || "untitled.txt";
    filenameInput.value = currentFilename;
  };
  reader.readAsText(file);
}

// =================== DEVELOPER INFO & FOOTER =================== //
function showDeveloperInfo() {
  const footerMessage = document.getElementById("footerMessage");
  footerMessage.classList.add("show");
  setTimeout(() => footerMessage.classList.remove("show"), 5000);
}

// If using a popover, close if user clicks outside it
document.addEventListener("click", (e) => {
  if (
    e.target !== developerBtn &&
    e.target !== devPopover &&
    !devPopover.contains(e.target) &&
    !developerBtn.contains(e.target)
  ) {
    devPopover.style.display = "none";
  }
});

// Optional: Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/service-worker.js")
    .then(() => console.log("Service Worker registered successfully."))
    .catch((err) => console.error("Service Worker registration failed:", err));
}
