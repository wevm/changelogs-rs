use crate::workspace::Workspace;
use petgraph::graph::{DiGraph, NodeIndex};
use std::collections::HashMap;

pub struct DependencyGraph {
    graph: DiGraph<String, ()>,
    node_indices: HashMap<String, NodeIndex>,
}

impl DependencyGraph {
    pub fn from_workspace(workspace: &Workspace) -> Self {
        let mut graph = DiGraph::new();
        let mut node_indices = HashMap::new();

        for package in &workspace.packages {
            let idx = graph.add_node(package.name.clone());
            node_indices.insert(package.name.clone(), idx);
        }

        for package in &workspace.packages {
            let from_idx = node_indices[&package.name];
            for dep in &package.dependencies {
                if let Some(&to_idx) = node_indices.get(dep) {
                    graph.add_edge(from_idx, to_idx, ());
                }
            }
        }

        Self {
            graph,
            node_indices,
        }
    }

    pub fn dependents(&self, package: &str) -> Vec<String> {
        let Some(&pkg_idx) = self.node_indices.get(package) else {
            return Vec::new();
        };

        self.graph
            .neighbors_directed(pkg_idx, petgraph::Direction::Incoming)
            .map(|idx| self.graph[idx].clone())
            .collect()
    }

    pub fn all_dependents(&self, package: &str) -> Vec<String> {
        let Some(&pkg_idx) = self.node_indices.get(package) else {
            return Vec::new();
        };

        let mut visited = std::collections::HashSet::new();
        let mut stack = vec![pkg_idx];
        let mut result = Vec::new();

        while let Some(idx) = stack.pop() {
            for neighbor in self
                .graph
                .neighbors_directed(idx, petgraph::Direction::Incoming)
            {
                if visited.insert(neighbor) {
                    result.push(self.graph[neighbor].clone());
                    stack.push(neighbor);
                }
            }
        }

        result
    }

    pub fn dependencies(&self, package: &str) -> Vec<String> {
        let Some(&pkg_idx) = self.node_indices.get(package) else {
            return Vec::new();
        };

        self.graph
            .neighbors_directed(pkg_idx, petgraph::Direction::Outgoing)
            .map(|idx| self.graph[idx].clone())
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dependents() {
        let mut graph = DiGraph::new();
        let a = graph.add_node("a".to_string());
        let b = graph.add_node("b".to_string());
        let c = graph.add_node("c".to_string());

        graph.add_edge(b, a, ());
        graph.add_edge(c, a, ());

        let mut node_indices = HashMap::new();
        node_indices.insert("a".to_string(), a);
        node_indices.insert("b".to_string(), b);
        node_indices.insert("c".to_string(), c);

        let dep_graph = DependencyGraph {
            graph,
            node_indices,
        };

        let dependents = dep_graph.dependents("a");
        assert_eq!(dependents.len(), 2);
        assert!(dependents.contains(&"b".to_string()));
        assert!(dependents.contains(&"c".to_string()));
    }
}
