import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useQuery } from "@tanstack/react-query";
import { Concept } from "@shared/schema";

interface KnowledgeGraphProps {
  onSelectConcept: (concept: Concept) => void;
  currentConceptId?: number;
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
    default:
      return "#4B5563"; // gray-600
  }
};

const KnowledgeGraph = ({ onSelectConcept, currentConceptId }: KnowledgeGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(500);
  
  const { data, isLoading, error } = useQuery<GraphData>({
    queryKey: ["/api/knowledge-graph"],
  });
  
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
