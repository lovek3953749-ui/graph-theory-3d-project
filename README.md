# Graph Theory — Network Intelligence Lab

A responsive, interactive Graph Theory project based on the supplied 12-page project guide. It combines a 3D campus-style graph, algorithm demonstrations, graph representations, six academic phases, real-world applications, and evaluation notes.

## Run the project

1. Extract the ZIP.
2. Open a terminal in the `graph-theory-3d-project` folder.
3. Start a local web server:

   ```bash
   python -m http.server 8000
   ```

4. Open `http://localhost:8000` in a modern browser.

The 3D scene uses Three.js from a CDN, so an internet connection is needed for that library and the optional Google Fonts. Use VS Code Live Server if preferred.

## Project files

- `index.html` — page structure and all application sections.
- `styles.css` — responsive dark UI, glass panels, layouts, and visual styling.
- `app.js` — navigation, 3D rendering, graph algorithms, theory pages, representations, and application cards.
- `graph-data.js` — campus graph vertices, coordinates, and weighted edges.
- `python/graph_engine.py` — companion Python + NetworkX implementation.
- `python/requirements.txt` — Python dependencies.

## Graph model

The sample is an undirected weighted graph:
- Vertices: Main Gate, Library, Hostel, Academic Block, Cafeteria, Sports Complex.
- Edges and weights are the illustrative values from the supplied guide.
- Weights are example distance/cost units, not measured campus distances.
- 3D coordinates are for visualization only; they are not geographic coordinates.

## Included algorithms

- BFS — unweighted fewest-edge path / traversal.
- DFS — depth-first traversal.
- Dijkstra — shortest path with non-negative weights.
- Bellman–Ford — shortest paths with negative-weight support and negative-cycle detection in the Python implementation.
- Kruskal and Prim — minimum spanning tree.
- Greedy graph coloring — order-dependent heuristic.
- Bipartite matching — small augmenting-path demonstration.

## Important academic notes

- BFS minimizes the number of edges, not the sum of weights.
- Dijkstra requires non-negative edge weights.
- A minimum spanning tree is defined for a connected, undirected, weighted graph; disconnected inputs produce a minimum spanning forest.
- Greedy coloring is not guaranteed to use the minimum possible number of colors.
- The matching demonstration uses a separate illustrative bipartite assignment graph.
- Performance benchmarks are not claimed; measure them on larger datasets before reporting results.

## Suggested improvements

Replace the illustrative campus data with permitted, measured walkways and distances. Add A* with a valid geographic heuristic, CSV/JSON import, disconnected graph test fixtures, runtime benchmarking, and a backend API if a multi-user deployment is required.
