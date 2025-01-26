// script.js

// DOM Elements
const editor = document.getElementById("editor");
const fileInput = document.getElementById("fileInput");
const filenameInput = document.getElementById("filenameInput");
const devPopover = document.getElementById("devPopover");
const developerBtn = document.getElementById("developerBtn");

// Track unsaved changes
let isModified = false;
// Keep track of the "current" filename (fallback usage)
let currentFilename = "untitled.txt";

// ====== FILE SYSTEM ACCESS API DETECTION ====== //
/** 
 * We check if the browser supports the new API.
 * If not, we default to the old approach.
 */
const supportsFileSystemAPI = (
  "showOpenFilePicker" in window && 
  "showSaveFilePicker" in window
);

// A handle to the opened file (File System Access API)
let fileHandle = null;


// ====== BASIC SETUP & EVENT LISTENERS ====== //

// Mark document as modified whenever the user types
editor.addEventListener("input", () => {
  isModified = true;
});

// Warn user about unsaved changes before closing
window.addEventListener("beforeunload", (e) => {
  if (isModified) {
    e.preventDefault();
    e.returnValue = "";
  }
});

// Reflect changes in the filename input
filenameInput.addEventListener("input", () => {
  currentFilename = filenameInput.value.trim() || "untitled.txt";
});

// Keyboard shortcuts: Ctrl+N, Ctrl+O, Ctrl+S
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
    switch (e.key.toLowerCase()) {
      case "n": // Ctrl+N
        e.preventDefault();
        newFile();
        break;
      case "o": // Ctrl+O
        e.preventDefault();
        openFile();
        break;
      case "s": // Ctrl+S
        e.preventDefault();
        saveFile();
        break;
      default:
        break;
    }
  }
});


// ====== CORE FUNCTIONS ====== //

/**
 * Create a new blank file (prompt user if unsaved).
 */
function newFile() {
  if (isModified) {
    const userConfirmed = confirm(
      "You have unsaved changes. Discard them and create a new file?"
    );
    if (!userConfirmed) return;
  }
  // Clear editor
  editor.value = "";
  isModified = false;
  
  // Reset filename to "untitled"
  currentFilename = "untitled.txt";
  filenameInput.value = currentFilename;
  
  // Reset file handle (File System Access API)
  fileHandle = null;
}

/**
 * Open a file:
 * - If File System Access API is supported => openFileSystemFile()
 * - Otherwise => fallbackOpenFile() with <input type="file" />
 */
function openFile() {
  if (isModified) {
    const userConfirmed = confirm(
      "You have unsaved changes. Discard them and open a file?"
    );
    if (!userConfirmed) return;
  }

  if (supportsFileSystemAPI) {
    openFileSystemFile();
  } else {
    fallbackOpenFile();
  }
}

/**
 * Save a file:
 * - If File System Access API is supported => 
 *     - If we already have a file handle, overwrite it
 *     - Otherwise, showSaveFilePicker
 * - Otherwise => fallback "download" approach
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


// ====== FILE SYSTEM ACCESS API APPROACH ====== //

/**
 * 1) Prompt user to pick a file from their local system.
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
    
    fileHandle = handle; // store for later overwriting
    const fileData = await fileHandle.getFile();
    const text = await fileData.text();
    
    editor.value = text;
    isModified = false;
    currentFilename = fileHandle.name || "untitled.txt";
    filenameInput.value = currentFilename;
  } catch (error) {
    console.error("Error opening file with File System Access API:", error);
    // user may have canceled
  }
}

/**
 * 2) "Save As" with the File System Access API 
 *    (when user hasn't previously opened a file handle).
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
    await overwriteFileSystemFile(); // now that we have a handle
  } catch (error) {
    console.error("Error in saveAsNewFileSystemFile:", error);
  }
}

/**
 * 3) Overwrite existing file (File System Access API).
 */
async function overwriteFileSystemFile() {
  if (!fileHandle) {
    // If we somehow have no handle, do Save As
    return saveAsNewFileSystemFile();
  }
  try {
    const writable = await fileHandle.createWritable();
    await writable.write(editor.value);
    await writable.close();
    isModified = false;
    console.log("File overwritten successfully!");
  } catch (error) {
    console.error("Error overwriting file:", error);
  }
}


// ====== FALLBACK (OLD) APPROACH ====== //

/**
 * Fallback open using <input type="file" /> 
 */
function fallbackOpenFile() {
  fileInput.value = ""; // reset so user can pick the same file again
  fileInput.click();
}

/**
 * Handle file selection from the fallback approach 
 * (triggered by <input onchange="handleFileOpen(event)">).
 */
function handleFileOpen(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    editor.value = e.target.result;
    isModified = false;
    currentFilename = file.name || "untitled.txt";
    filenameInput.value = currentFilename;
    // In fallback mode, we do NOT have a handle to the real file
    fileHandle = null;
  };
  reader.readAsText(file);
}

/**
 * Fallback "save" using Blob + <a> approach (always new file)
 */
function fallbackSaveFile() {
  const fileNameToSave = filenameInput.value.trim() || "untitled.txt";
  const content = editor.value;

  const blob = new Blob([content], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileNameToSave;
  document.body.appendChild(a);
  a.style.display = "none";
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);

  isModified = false;
  console.log(`Fallback: file saved as "${fileNameToSave}"`);
}


// ====== DEVELOPER INFO & FOOTER ====== //

/**
 * Show the footer message for a few seconds when the developer button is clicked.
 */
function showDeveloperInfo() {
  // If you still use the old popover approach, you can toggle it here too:
  // if (devPopover.style.display === "block") {
  //   devPopover.style.display = "none";
  // } else {
  //   devPopover.style.display = "block";
  // }

  const footerMessage = document.getElementById("footerMessage");

  // Show the footer message
  footerMessage.classList.add("show");

  // Automatically hide it after 5 seconds
  setTimeout(() => {
    footerMessage.classList.remove("show");
  }, 5000);
}

// Optionally close the popover if clicking outside
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

/*************************************************
 * DRAG & DROP FUNCTIONALITY
 *************************************************/
// Listen for dragover to allow dropping
editor.addEventListener("dragover", (e) => {
  e.preventDefault(); // Necessary for drop to fire
  editor.classList.add("drag-hover");
});

// Listen for dragleave if you want to remove highlight
editor.addEventListener("dragleave", (e) => {
  editor.classList.remove("drag-hover");
});

// Listen for drop event
editor.addEventListener("drop", (e) => {
  e.preventDefault(); 
  editor.classList.remove("drag-hover");

  // Access the dropped files
  const files = e.dataTransfer.files;
  if (files && files.length > 0) {
    handleDroppedFile(files[0]); // Let's read the first dropped file
  }
});

// A helper function to read the dropped file (plain text)
function handleDroppedFile(file) {
  // Optional: Check file type 
  // (If you only want .txt, do something like:)
  if (!file.name.endsWith(".txt")) {
    alert("Please drop a .txt file!");
    return;
  }

  // Use FileReader to read text
  const reader = new FileReader();
  reader.onload = (event) => {
    editor.value = event.target.result;
    isModified = false;

    // Set the filename in your input
    currentFilename = file.name || "untitled.txt";
    filenameInput.value = currentFilename;

    // NOTE: Because the user dragged a file from their system,
    // we do NOT have a File System Access API handle. 
    // If your browser supports direct overwriting, the user 
    // must confirm picking the file again or do "Save As."
  };
  reader.readAsText(file);
}


// ====== SERVICE WORKER ====== //
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/service-worker.js")
    .then(() => console.log("Service Worker registered successfully."))
    .catch((error) =>
      console.error("Service Worker registration failed:", error)
    );
}
