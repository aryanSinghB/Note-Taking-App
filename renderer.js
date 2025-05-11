document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const noteList = document.getElementById('note-list');
  const newNoteBtn = document.getElementById('new-note-btn');
  const noteEditor = document.getElementById('note-editor');
  const previewPane = document.getElementById('preview-pane');
  const noteTitleInput = document.getElementById('note-title');
  const saveNoteBtn = document.getElementById('save-note-btn');
  const deleteNoteBtn = document.getElementById('delete-note-btn');
  const viewGraphBtn = document.getElementById('view-graph-btn');
  const closeGraphBtn = document.getElementById('close-graph-btn');
  const graphContainer = document.getElementById('graph-container');
  const graphView = document.getElementById('graph-view');
  const toggleThemeBtn = document.getElementById('toggle-theme-btn');

  // State variables
  let currentNote = null;
  let allNotes = [];
  let graphInstance = null;

  // Initialize the app
  async function init() {
    await loadNotes();
    setupEventListeners();
    checkTheme();
  }

  // Load notes from filesystem
  async function loadNotes() {
    try {
      allNotes = await window.api.getNotes();
      renderNoteList();
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  }

  // Render the note list in the sidebar
  function renderNoteList() {
    noteList.innerHTML = '';

    allNotes.forEach(note => {
      const noteItem = document.createElement('div');
      noteItem.className = 'note-item';
      if (currentNote && currentNote.title === note.title) {
        noteItem.classList.add('active');
      }
      noteItem.textContent = note.title;
      noteItem.dataset.title = note.title;
      noteItem.addEventListener('click', () => openNote(note.title));

      noteList.appendChild(noteItem);
    });
  }

  // Open a note for editing
  async function openNote(title) {
    try {
      const result = await window.api.readNote(title);

      if (result.success) {
        currentNote = { title, content: result.content };
        noteTitleInput.value = title;
        noteEditor.value = result.content;
        updatePreview();

        // Update active note in the list
        document.querySelectorAll('.note-item').forEach(item => {
          item.classList.toggle('active', item.dataset.title === title);
        });
      }
    } catch (error) {
      console.error('Failed to open note:', error);
    }
  }

  // Create a new note
  async function createNewNote() {
    const title = `New Note ${allNotes.length + 1}`;

    try {
      const result = await window.api.createNote(title);

      if (result.success) {
        await loadNotes();
        openNote(title);
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  }

  // Save the current note
  async function saveCurrentNote() {
    if (!currentNote) return;

    try {
      const content = noteEditor.value;
      await window.api.saveNote({ title: currentNote.title, content });
      currentNote.content = content;
      updatePreview();
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  }

  // Delete the current note
  async function deleteCurrentNote() {
    if (!currentNote) return;

    if (confirm(`Are you sure you want to delete "${currentNote.title}"?`)) {
      try {
        await window.api.deleteNote(currentNote.title);
        currentNote = null;
        noteTitleInput.value = '';
        noteEditor.value = '';
        previewPane.innerHTML = '';
        await loadNotes();
      } catch (error) {
        console.error('Failed to delete note:', error);
      }
    }
  }

  // Update the markdown preview
  function updatePreview() {
    if (!currentNote) {
      previewPane.innerHTML = '';
      return;
    }

    // Use marked.js to convert markdown to HTML
    let html = marked.parse(noteEditor.value);

    // Process wiki links [[Note Title]]
    html = processWikiLinks(html);

    previewPane.innerHTML = html;

    // Add event listeners to note links
    document.querySelectorAll('.note-link').forEach(link => {
      link.addEventListener('click', () => {
        const linkedTitle = link.dataset.title;
        if (allNotes.some(note => note.title === linkedTitle)) {
          openNote(linkedTitle);
        } else {
          // Create the linked note if it doesn't exist
          createLinkedNote(linkedTitle);
        }
      });
    });
  }

  // Process wiki links in the content
  function processWikiLinks(html) {
    // Simple regex to find [[Note Title]] patterns
    // A more robust solution would use a proper HTML parser
    const wikiLinkRegex = /\[\[(.*?)\]\]/g;

    return html.replace(wikiLinkRegex, (match, title) => {
      return `<span class="note-link" data-title="${title}">${title}</span>`;
    });
  }

  // Create a new note from a link
  async function createLinkedNote(title) {
    try {
      const result = await window.api.createNote(title);

      if (result.success) {
        await loadNotes();
        openNote(title);
      }
    } catch (error) {
      console.error('Failed to create linked note:', error);
    }
  }

  // Toggle between light and dark theme
  function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('darkTheme', isDark);
  }

  // Check and apply saved theme
  function checkTheme() {
    const isDark = localStorage.getItem('darkTheme') === 'true';
    document.body.classList.toggle('dark-theme', isDark);
  }

  // Show the graph view
  async function showGraphView() {


    graphContainer.classList.remove('hidden');

    if (!graphInstance) {
      // Create file system manager interface
      const fileSystemManager = {
        getAllNotes: async () => allNotes,
        readNote: async (title) => window.api.readNote(title)
      };

      // Create note linker interface
      const noteLinker = {
        extractLinks: (content) => {
          const wikiLinkRegex = /\[\[(.*?)\]\]/g;
          const links = [];
          let match;
          while ((match = wikiLinkRegex.exec(content)) !== null) {
            links.push(match[1]);
          }
          return links;
        }
      };

      // Initialize GraphView
      graphInstance = new GraphView(fileSystemManager, noteLinker);
      await graphInstance.init();
    } else {
      await graphInstance.updateGraph();
    }


    // This is a placeholder - will be implemented in Week 5
    // graphContainer.classList.remove('hidden');
    // generateGraph();
  }

  // Generate the graph visualization
  function generateGraph() {
    // This is a placeholder - will be implemented in Week 5
    // Using vis.js to create a graph of note connections

    const nodes = [];
    const edges = [];

    // For now, just create nodes for each note
    allNotes.forEach((note, index) => {
      nodes.push({ id: note.title, label: note.title });
    });

    // In the full implementation, you would:
    // 1. Parse each note to find [[links]]
    // 2. Create edges between notes based on these links

    const data = {
      nodes: new vis.DataSet(nodes),
      edges: new vis.DataSet(edges)
    };

    const options = {
      nodes: {
        shape: 'dot',
        size: 16,
        font: {
          size: 12
        }
      },
      physics: {
        stabilization: true
      }
    };

    new vis.Network(graphView, data, options);
  }

  // Setup all event listeners
  function setupEventListeners() {
    newNoteBtn.addEventListener('click', createNewNote);
    saveNoteBtn.addEventListener('click', saveCurrentNote);
    deleteNoteBtn.addEventListener('click', deleteCurrentNote);
    viewGraphBtn.addEventListener('click', showGraphView);
    closeGraphBtn.addEventListener('click', () => {
      graphContainer.classList.add('hidden');
      if (graphInstance) {
        graphInstance.destroy();
        graphInstance = null;
      }
    });
    // Add graph navigation event listener
    document.addEventListener('graph:navigate', (event) => {
      const title = event.detail.title;
      if (allNotes.some(note => note.title === title)) {
        openNote(title);
        graphContainer.classList.add('hidden');
      }
    });

    // Add graph create note event listener
    document.addEventListener('graph:create', async (event) => {
      const title = event.detail.title;
      await createLinkedNote(title);
      graphContainer.classList.add('hidden');
    });

    toggleThemeBtn.addEventListener('click', toggleTheme);

    // Update preview when editing
    noteEditor.addEventListener('input', updatePreview);
  }

  // Start the app
  init();
});