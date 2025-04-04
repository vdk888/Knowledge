import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useQuery } from "@tanstack/react-query";
import { Concept, UserProgress } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

interface KnowledgeGraphProps {
  onSelectConcept: (concept: Concept) => void;
  currentConceptId?: number;
  showOnlyLearned?: boolean;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: number;
  name: string;
  domain: string;
  difficulty: string;
  description: string;
  r: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: number | GraphNode;
  target: number | GraphNode;
  type: string;
  strength: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const getDomainColor = (domain: string): string => {
  switch (domain) {
    case "Physics":
      return "#3B82F6"; // blue-500
    case "Mathematics":
      return "#8B5CF6"; // purple-500
    case "Computer Science":
      return "#10B981"; // green-500
    case "Biology":
      return "#F59E0B"; // amber-500
    case "Economics":
      return "#EF4444"; // red-500
    case "Sociology":
      return "#EC4899"; // pink-500 
    case "Psychology":
      return "#6366F1"; // indigo-500
    case "Human Science":
      return "#14B8A6"; // teal-500
    default:
      return "#6B7280"; // gray-500
  }
};

const getDomainStrokeColor = (domain: string): string => {
  switch (domain) {
    case "Physics":
      return "#1D4ED8"; // blue-700
    case "Mathematics":
      return "#6D28D9"; // purple-700
    case "Computer Science":
      return "#059669"; // green-700
    case "Biology":
      return "#B45309"; // amber-700
    case "Economics":
      return "#B91C1C"; // red-700
    case "Sociology":
      return "#BE185D"; // pink-700
    case "Psychology":
      return "#4338CA"; // indigo-700
    case "Human Science":
      return "#0F766E"; // teal-700
    default:
      return "#4B5563"; // gray-600
  }
};

const KnowledgeGraph = ({ onSelectConcept, currentConceptId, showOnlyLearned = true }: KnowledgeGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(500);
  const { user } = useAuth();
  const [discoveredNodes, setDiscoveredNodes] = useState<Set<number>>(new Set());
  
  // Get the full knowledge graph data
  const { data: graphData, isLoading: isGraphLoading, error: graphError } = useQuery<GraphData>({
    queryKey: ["/api/knowledge-graph"],
  });
  
  // Get user progress to identify known concepts
  const { data: userProgress = [], isLoading: isProgressLoading } = useQuery<UserProgress[]>({
    queryKey: ["/api/user/progress"],
    enabled: !!user && showOnlyLearned,
  });
  
  // Filter the graph to only show nodes that the user knows
  const isLoading = isGraphLoading || isProgressLoading;
  const error = graphError;
  
  // Compute the filtered data based on user's knowledge
  const data = React.useMemo(() => {
    if (!graphData || (!userProgress && showOnlyLearned)) return graphData;
    
    // If we're not restricting to learned nodes or user has no progress yet, show all nodes
    if (!showOnlyLearned || userProgress.length === 0) return graphData;
    
    // Otherwise, filter based on learned concepts and discovered nodes
    const learnedConceptIds = new Set(
      userProgress
        .filter(p => p.isLearned)
        .map(p => p.conceptId)
    );
    
    // Combine learned concepts with discovered nodes
    const visibleNodeIds = new Set([...Array.from(learnedConceptIds), ...Array.from(discoveredNodes)]);
    
    // Also include the current concept if it exists
    if (currentConceptId) visibleNodeIds.add(currentConceptId);
    
    // Filter nodes to only include visible ones
    const filteredNodes = graphData.nodes.filter(node => visibleNodeIds.has(node.id));
    
    // Filter links to only include those where both source and target are visible
    const filteredLinks = graphData.links.filter(link => {
      const sourceId = typeof link.source === 'number' ? link.source : link.source.id;
      const targetId = typeof link.target === 'number' ? link.target : link.target.id;
      return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });
    
    return {
      nodes: filteredNodes,
      links: filteredLinks
    };
  }, [graphData, userProgress, showOnlyLearned, discoveredNodes, currentConceptId]);
  
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const parent = svgRef.current.parentElement;
        if (parent) {
          setWidth(parent.clientWidth);
          setHeight(parent.clientHeight);
        }
      }
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  
  useEffect(() => {
    if (!data || !svgRef.current) return;
    
    // Clear SVG
    d3.select(svgRef.current).selectAll("*").remove();
    
    const svg = d3.select(svgRef.current);
    
    // Create a simulation with forces
    const simulation = d3.forceSimulation<GraphNode, GraphLink>(data.nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(data.links)
        .id(d => d.id)
        .distance(link => 100 - (link.strength || 5) * 5)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(d => (d.r || 25) + 5));
    
    // Create links
    const link = svg.append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("class", "link")
      .attr("stroke", "#94A3B8")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => (d.strength || 5) / 3);
    
    // Create nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .attr("class", "node")
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        
        // When a node is clicked, discover neighboring concepts too
        if (showOnlyLearned && graphData && graphData.links) {
          const newDiscoveredNodes = new Set(discoveredNodes);
          
          // Find all nodes connected to the selected node
          graphData.links.forEach(link => {
            const sourceId = typeof link.source === 'number' ? link.source : link.source.id;
            const targetId = typeof link.target === 'number' ? link.target : link.target.id;
            
            // If this node is connected to the clicked node, add it to discovered nodes
            if (sourceId === d.id) {
              newDiscoveredNodes.add(targetId);
            } else if (targetId === d.id) {
              newDiscoveredNodes.add(sourceId);
            }
          });
          
          // Update the discovered nodes state
          setDiscoveredNodes(newDiscoveredNodes);
        }
        
        onSelectConcept(d);
      })
      .call(drag(simulation) as any);
    
    // Add circles to nodes
    node.append("circle")
      .attr("r", d => d.r || 25)
      .attr("fill", d => getDomainColor(d.domain))
      .attr("stroke", d => getDomainStrokeColor(d.domain))
      .attr("stroke-width", 2)
      .attr("fill-opacity", d => currentConceptId === d.id ? 1 : 0.8);
    
    // Add text to nodes
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .attr("fill", "white")
      .attr("font-size", d => d.name.length > 15 ? "9" : "10")
      .text(d => d.name.length > 20 ? d.name.substring(0, 18) + "..." : d.name);
    
    // Add legend
    const domains = [...new Set(data.nodes.map(n => n.domain))];
    const legend = svg.append("g")
      .attr("transform", `translate(10, ${height - 10 - domains.length * 20})`)
      .attr("class", "legend");
    
    domains.forEach((domain, i) => {
      const legendItem = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);
      
      legendItem.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("fill", getDomainColor(domain));
      
      legendItem.append("text")
        .attr("x", 15)
        .attr("y", 9)
        .attr("font-size", 12)
        .attr("fill", "#4B5563")
        .text(domain);
    });
    
    // Update positions on simulation tick
    simulation.on("tick", () => {
      // Keep nodes within bounds
      node.attr("transform", d => {
        d.x = Math.max(d.r || 25, Math.min(width - (d.r || 25), d.x || 0));
        d.y = Math.max(d.r || 25, Math.min(height - (d.r || 25), d.y || 0));
        return `translate(${d.x},${d.y})`;
      });
      
      link
        .attr("x1", d => (d.source as GraphNode).x || 0)
        .attr("y1", d => (d.source as GraphNode).y || 0)
        .attr("x2", d => (d.target as GraphNode).x || 0)
        .attr("y2", d => (d.target as GraphNode).y || 0);
    });
    
    return () => {
      simulation.stop();
    };
  }, [data, width, height, currentConceptId, onSelectConcept]);
  
  // Drag functions for interactive nodes
  function drag(simulation: d3.Simulation<GraphNode, GraphLink>) {
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    
    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">
          Error loading knowledge graph. Please try again later.
        </div>
      </div>
    );
  }
  
  return (
    <div className="force-graph-container">
      <svg 
        ref={svgRef} 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${width} ${height}`}
      ></svg>
    </div>
  );
};

export default KnowledgeGraph;
