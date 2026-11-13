"""
Companion Python implementation for the Graph Theory project.
Install: pip install -r requirements.txt
Run:     python graph_engine.py
The sample edge weights are illustrative units, not surveyed campus distances.
"""
from __future__ import annotations

import networkx as nx
import matplotlib.pyplot as plt

NODES = [
    "Main Gate", "Library", "Hostel",
    "Academic Block", "Cafeteria", "Sports Complex",
]

EDGES = [
    ("Main Gate", "Library", 4),
    ("Main Gate", "Hostel", 2),
    ("Library", "Academic Block", 3),
    ("Hostel", "Library", 1),
    ("Hostel", "Cafeteria", 6),
    ("Academic Block", "Cafeteria", 2),
    ("Academic Block", "Sports Complex", 5),
    ("Library", "Cafeteria", 3),
    ("Cafeteria", "Sports Complex", 1),
]


def build_graph() -> nx.Graph:
    graph = nx.Graph()
    graph.add_nodes_from(NODES)
    graph.add_weighted_edges_from(EDGES, weight="weight")
    return graph


def show_representations(graph: nx.Graph) -> None:
    print("\nADJACENCY LIST")
    for node, neighbors in graph.adj.items():
        print(f"{node}: {[(neighbor, data['weight']) for neighbor, data in neighbors.items()]}")

    print("\nADJACENCY MATRIX (weighted)")
    print(nx.to_numpy_array(graph, nodelist=NODES, weight="weight"))

    print("\nEDGE LIST")
    for edge in graph.edges(data=True):
        print(edge)

    print("\nINCIDENCE MATRIX")
    print(nx.incidence_matrix(graph, nodelist=NODES, oriented=False).toarray())


def run_algorithms(graph: nx.Graph, source: str, target: str) -> None:
    print("\nBFS traversal:", list(nx.bfs_tree(graph, source).nodes))
    print("DFS traversal:", list(nx.dfs_preorder_nodes(graph, source)))

    path = nx.dijkstra_path(graph, source, target, weight="weight")
    distance = nx.dijkstra_path_length(graph, source, target, weight="weight")
    print("\nDijkstra shortest path:", " -> ".join(path))
    print("Total illustrative weight:", distance)

    print("\nBellman-Ford:", nx.bellman_ford_path(graph, source, target, weight="weight"))

    tree = nx.minimum_spanning_tree(graph, algorithm="kruskal", weight="weight")
    print("\nKruskal MST edges:", list(tree.edges(data=True)))
    print("MST total weight:", tree.size(weight="weight"))

    tree_prim = nx.minimum_spanning_tree(graph, algorithm="prim", weight="weight")
    print("Prim MST total weight:", tree_prim.size(weight="weight"))

    coloring = nx.coloring.greedy_color(graph, strategy="largest_first")
    print("\nGreedy coloring:", coloring)
    print("Number of colors:", len(set(coloring.values())))


def draw_graph(graph: nx.Graph, source: str, target: str) -> None:
    path = nx.dijkstra_path(graph, source, target, weight="weight")
    path_edges = {frozenset((u, v)) for u, v in zip(path, path[1:])}
    pos = nx.spring_layout(graph, seed=7, weight="weight")

    edge_colors = [
        "#F4B942" if frozenset((u, v)) in path_edges else "#8CA4B3"
        for u, v in graph.edges()
    ]

    plt.figure(figsize=(12, 7), facecolor="#0B1724")
    ax = plt.gca()
    ax.set_facecolor("#0B1724")
    nx.draw_networkx_nodes(
        graph, pos, node_color="#176B87", node_size=1900,
        edgecolors="#51E0DC", linewidths=2, ax=ax
    )
    nx.draw_networkx_labels(
        graph, pos, font_color="white", font_size=8, font_weight="bold", ax=ax
    )
    nx.draw_networkx_edges(
        graph, pos, edge_color=edge_colors, width=3, ax=ax
    )
    nx.draw_networkx_edge_labels(
        graph, pos, edge_labels=nx.get_edge_attributes(graph, "weight"),
        font_color="#FFD58A", font_size=9, ax=ax
    )
    ax.set_title(
        f"Campus shortest route (Dijkstra): {' → '.join(path)} | cost = "
        f"{nx.dijkstra_path_length(graph, source, target, weight='weight')}",
        color="white", pad=18
    )
    ax.axis("off")
    plt.tight_layout()
    plt.show()


def test_cases(graph: nx.Graph) -> None:
    print("\nTEST CASES")
    # A route where the direct-looking alternative is not the cheapest.
    assert nx.dijkstra_path_length(graph, "Main Gate", "Sports Complex", weight="weight") == 7
    # Start equals destination.
    assert nx.dijkstra_path(graph, "Library", "Library", weight="weight") == ["Library"]
    assert nx.dijkstra_path_length(graph, "Library", "Library", weight="weight") == 0

    # Disconnected destination handling.
    disconnected = graph.copy()
    disconnected.add_node("Remote Lab")
    try:
        nx.shortest_path(disconnected, "Main Gate", "Remote Lab", weight="weight")
    except nx.NetworkXNoPath:
        print("PASS: unreachable destination handled (no path).")

    # All Dijkstra weights must be non-negative.
    assert all(data["weight"] >= 0 for _, _, data in graph.edges(data=True))
    print("PASS: start=end, known shortest route, disconnected node, non-negative weights.")


def main() -> None:
    graph = build_graph()
    source, target = "Main Gate", "Sports Complex"
    print(f"Graph: |V|={graph.number_of_nodes()}, |E|={graph.number_of_edges()}")
    print("Density:", round(nx.density(graph), 2))
    print("Connected:", nx.is_connected(graph))
    show_representations(graph)
    run_algorithms(graph, source, target)
    test_cases(graph)
    draw_graph(graph, source, target)


if __name__ == "__main__":
    main()
