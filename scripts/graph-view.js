
class GraphView {
  constructor(fileSystemManager, noteLinker) {
    this.fileSystem = fileSystemManager;
    this.noteLinker = noteLinker;
    this.network = null;
    this.nodes = null;
    this.edges = null;
    this.container = document.getElementById('graph-view');
  }

  /**
   * Build graph data from notes and their links
   * @returns {Promise<Object>} Graph data with nodes and edges
   */
  async buildGraphData() {
    try {
      const allNotes = await this.fileSystem.getAllNotes();
      const nodes = [];
      const edges = [];
      const noteMap = new Map(); // Map to track processed notes
      
      // Create nodes for all notes
      allNotes.forEach(note => {
        nodes.push({
          id: note.title,
          label: note.title,
          title: note.title // Tooltip on hover
        });
        
        noteMap.set(note.title, true);
      });
      
      // Process each note to find links
      for (const note of allNotes) {
        const content = (await this.fileSystem.readNote(note.title)).content;
        if (!content) continue;
        
        // Extract links from content
        const links = this.noteLinker.extractLinks(content);
        
        // Create edges for each link
        links.forEach(linkedTitle => {
          // Create edges even to notes that don't exist yet
          if (!noteMap.has(linkedTitle)) {
            nodes.push({
              id: linkedTitle,
              label: linkedTitle,
              title: linkedTitle,
              color: {
                background: '#E8E8E8', // Lighter color for non-existent notes
                border: '#CCCCCC'
              },
              font: {
                color: '#999999' // Lighter text for non-existent notes
              }
            });
            noteMap.set(linkedTitle, true);
          }
          
          // Add edge from this note to linked note
          edges.push({
            from: note.title,
            to: linkedTitle,
            arrows: {
              to: {
                enabled: true,
                scaleFactor: 0.5
              }
            }
          });
        });
      }
      
      return { nodes, edges };
    } catch (error) {
      console.error('Error building graph data:', error);
      return { nodes: [], edges: [] };
    }
  }

  /**
   * Render the graph visualization
   * @returns {Promise<void>}
   */
  async renderGraph() {
    if (!this.container) {
      console.error('Graph container not found');
      return;
    }
    
    try {
      const { nodes, edges } = await this.buildGraphData();
      
      // Create datasets
      this.nodes = new vis.DataSet(nodes);
      this.edges = new vis.DataSet(edges);
      
      // Graph configuration options
      const options = {
        nodes: {
          shape: 'dot',
          size: 16,
          font: {
            size: 14,
            face: 'Tahoma'
          },
          borderWidth: 2,
          shadow: true
        },
        edges: {
          width: 1,
          color: {
            color: '#848484',
            highlight: '#4A86E8'
          },
          smooth: {
            type: 'continuous'
          }
        },
        physics: {
          stabilization: true,
          barnesHut: {
            gravitationalConstant: -2000,
            centralGravity: 0.3,
            springLength: 95,
            springConstant: 0.04
          }
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          zoomView: true,
          dragView: true
        }
      };
      
      // Create the network
      this.network = new vis.Network(
        this.container, 
        { nodes: this.nodes, edges: this.edges }, 
        options
      );
      
      // Add event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Error rendering graph:', error);
    }
  }

  /**
   * Setup event listeners for the graph
   */
  setupEventListeners() {
    if (!this.network) return;
    
    // Click event - navigate to note when node is clicked
    this.network.on('click', event => {
      if (event.nodes.length > 0) {
        const nodeId = event.nodes[0];
        
        // Custom event for note navigation
        const navigateEvent = new CustomEvent('graph:navigate', {
          detail: { title: nodeId }
        });
        document.dispatchEvent(navigateEvent);
      }
    });
    
    // Double-click event - create note if it doesn't exist
    this.network.on('doubleClick', event => {
      if (event.nodes.length > 0) {
        const nodeId = event.nodes[0];
        
        // Custom event for note creation
        const createEvent = new CustomEvent('graph:create', {
          detail: { title: nodeId }
        });
        document.dispatchEvent(createEvent);
      }
    });
  }

  /**
   * Focus the graph on a specific note
   * @param {string} noteTitle - Title of note to focus on
   */
  focusOnNote(noteTitle) {
    if (!this.network || !noteTitle) return;
    
    // Check if node exists
    const nodeIds = this.nodes.getIds();
    if (!nodeIds.includes(noteTitle)) return;
    
    // Focus on the node
    this.network.focus(noteTitle, {
      scale: 1.2,
      animation: {
        duration: 500,
        easingFunction: 'easeInOutQuad'
      }
    });
    
    // Select the node
    this.network.selectNodes([noteTitle]);
  }

  /**
   * Update the graph with new data
   * @returns {Promise<void>}
   */
  async updateGraph() {
    if (!this.network) return;
    
    try {
      const { nodes, edges } = await this.buildGraphData();
      
      // Update datasets
      this.nodes.clear();
      this.edges.clear();
      this.nodes.add(nodes);
      this.edges.add(edges);
    } catch (error) {
      console.error('Error updating graph:', error);
    }
  }

  /**
   * Get a PNG snapshot of the current graph
   * @returns {string|null} Data URL of the PNG image
   */
  getGraphSnapshot() {
    if (!this.network) return null;
    
    return this.network.canvas.toDataURL();
  }

  /**
   * Destroy the network instance
   */
  destroy() {
    if (this.network) {
      this.network.destroy();
      this.network = null;
    }
  }
}