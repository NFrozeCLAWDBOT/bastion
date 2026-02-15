import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { DependencyNode } from "@/types/dependency";
import { GraphTooltip } from "./GraphTooltip";

const RISK_COLORS: Record<string, string> = {
  critical: "#C41A1A",
  high: "#E8590C",
  medium: "#F59E0B",
  low: "#06B6D4",
  none: "#22C55E",
  unknown: "#6B7280",
};

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  data: DependencyNode;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: GraphNode | string;
  target: GraphNode | string;
}

export function DependencyGraph({
  nodes: depNodes,
  onNodeClick,
  selectedNodeId,
}: {
  nodes: DependencyNode[];
  onNodeClick: (node: DependencyNode) => void;
  selectedNodeId?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    node: DependencyNode;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!svgRef.current || depNodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Build graph data
    const nodeMap = new Map<string, GraphNode>();
    const graphNodes: GraphNode[] = [];
    const graphLinks: GraphLink[] = [];

    depNodes.forEach((n) => {
      const id = `${n.name}@${n.version}`;
      const node: GraphNode = { id, data: n };
      nodeMap.set(id, node);
      graphNodes.push(node);
    });

    depNodes.forEach((n) => {
      const sourceId = `${n.name}@${n.version}`;
      n.dependsOn.forEach((targetId) => {
        if (nodeMap.has(targetId)) {
          graphLinks.push({ source: sourceId, target: targetId });
        }
      });
    });

    // Zoom
    const g = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    // Simulation
    const simulation = d3
      .forceSimulation(graphNodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(graphLinks)
          .id((d) => d.id)
          .distance(80)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(25))
      .alphaDecay(0.05);

    // Links
    const link = g
      .append("g")
      .selectAll("line")
      .data(graphLinks)
      .join("line")
      .attr("stroke", "rgba(255,255,255,0.08)")
      .attr("stroke-width", 1);

    // Node groups
    const node = g
      .append("g")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(graphNodes)
      .join("g")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Glow filter
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "glow");
    filter
      .append("feGaussianBlur")
      .attr("stdDeviation", "3")
      .attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Node circles
    node
      .append("circle")
      .attr("r", (d) => (d.data.isDirect ? 10 : 7))
      .attr("fill", (d) => RISK_COLORS[d.data.riskLevel] || RISK_COLORS.unknown)
      .attr("opacity", 0.85)
      .attr("filter", "url(#glow)");

    // Selected ring
    node
      .append("circle")
      .attr("r", (d) => (d.data.isDirect ? 14 : 11))
      .attr("fill", "none")
      .attr("stroke", (d) => {
        const id = `${d.data.name}@${d.data.version}`;
        return id === selectedNodeId
          ? RISK_COLORS[d.data.riskLevel] || "#fff"
          : "transparent";
      })
      .attr("stroke-width", 2)
      .attr("opacity", 0.6);

    // Hover and click
    node
      .on("mouseenter", (event, d) => {
        setTooltip({ node: d.data, x: event.clientX, y: event.clientY });
      })
      .on("mousemove", (event, d) => {
        setTooltip({ node: d.data, x: event.clientX, y: event.clientY });
      })
      .on("mouseleave", () => {
        setTooltip(null);
      })
      .on("click", (_event, d) => {
        onNodeClick(d.data);
      });

    // Tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as GraphNode).x!)
        .attr("y1", (d) => (d.source as GraphNode).y!)
        .attr("x2", (d) => (d.target as GraphNode).x!)
        .attr("y2", (d) => (d.target as GraphNode).y!);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [depNodes, onNodeClick, selectedNodeId]);

  return (
    <div className="glass-panel relative overflow-hidden h-[500px] lg:h-[600px]">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ background: "transparent" }}
      />
      {tooltip && (
        <GraphTooltip node={tooltip.node} x={tooltip.x} y={tooltip.y} />
      )}
    </div>
  );
}
