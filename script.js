// script.js

const editor = document.getElementById("editor");
const fileInput = document.getElementById("fileInput");
const filenameInput = document.getElementById("filenameInput");

// The popover and button for developer info
const devPopover = document.getElementById("devPopover");
const developerBtn = document.getElementById("developerBtn");

// Track unsaved changes
let isModified = false;

// Keep track of the "current" filename
let currentFilename = "untitled.txt";

// When user types, mark as modified
editor.addEventListener("input", () => {
  isModified = true;
});

// Prompt user if there are unsaved changes on window unload
window.addEventListener("beforeunload", (e) => {
  if (isModified) {
    e.preventDefault();
    e.returnValue = "";
  }
});

// Update current filename whenever user types in the input
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

/**
 * Create a new file (blank). Prompt to discard changes if unsaved.
 */
function newFile() {
  if (isModified) {
    const userConfirmed = confirm(
      "You have unsaved changes. Discard them and create a new file?"
    );
    if (!userConfirmed) return;
  }
  editor.value = "";
  isModified = false;
  currentFilename = "untitled.txt";
  filenameInput.value = "untitled.txt";
}

/**
 * Trigger file input click to open a text file from local disk
 */
function openFile() {
  if (isModified) {
    const userConfirmed = confirm(
      "You have unsaved changes. Discard them and open a file?"
    );
    if (!userConfirmed) return;
  }
  fileInput.value = "";
  fileInput.click();
}

/**
 * Handle file selection
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
  };
  reader.readAsText(file);
}

/**
 * Save (download) the current text
 */
function saveFile() {
  let fileNameToSave = filenameInput.value.trim() || "untitled.txt";
  const content = editor.value;

  const blob = new Blob([content], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileNameToSave;
  document.body.appendChild(a);
  a.style.display = "none";
  a.click();

  // Cleanup
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);

  isModified = false;
  currentFilename = fileNameToSave;
}

/**
 * Show or hide developer info popover
 */
function showDeveloperInfo() {
  // Toggle the popover display
  if (devPopover.style.display === "block") {
    devPopover.style.display = "none";
  } else {
    devPopover.style.display = "block";
  }
}

// Close the popover if clicking outside (optional)
document.addEventListener("click", (e) => {
  const target = e.target;

  // Ensure clicks on the button or icon inside it still toggle properly
  if (
    target !== developerBtn &&
    target !== devPopover &&
    !devPopover.contains(target) &&
    !developerBtn.contains(target) // Ensure clicks on button content count
  ) {
    devPopover.style.display = "none";
  }
});