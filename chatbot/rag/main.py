import argparse
import json
import os
import sys
import logging
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich import print as rprint

# Add parent directory to path to allow absolute imports if running as script
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag.rag_pipeline import RAGPipeline
from rag.evaluator import RAGEvaluator
from rag.cache_manager import CacheManager

console = Console()

def setup_logging():
    logging.basicConfig(level=logging.INFO, format="%(message)s")

def cmd_ingest(args, pipeline):
    console.print(f"[bold blue]Ingesting documents from:[/bold blue] {args.path}")
    pipeline.ingest(args.path)
    console.print("[bold green]Success:[/bold green] Documents indexed.")

def cmd_query(args, pipeline):
    console.print(f"[bold cyan]Question:[/bold cyan] {args.question}")
    with console.status("[bold green]Generating answer...[/bold green]"):
        result = pipeline.query(args.question)
    
    # Print Answer
    console.print(Panel(
        result["answer"], 
        title="[bold green]Amen Bank Assistant[/bold green]",
        subtitle=f"Confidence: {result['confidence']:.2f} | Grounded: {result['grounded']}"
    ))
    
    # Print Sources
    if result["sources"]:
        table = Table(title="Sources")
        table.add_column("Filename", style="magenta")
        for src in result["sources"]:
            table.add_row(src)
        console.print(table)
    
    console.print(f"[dim]Timing: {result['timing']:.2f}s | Cached: {result['cached']}[/dim]")

def cmd_evaluate(args, pipeline):
    if not os.path.exists(args.dataset):
        console.print(f"[bold red]Error:[/bold red] Dataset file not found: {args.dataset}")
        return

    with open(args.dataset, 'r', encoding='utf-8') as f:
        dataset = json.load(f)
    
    evaluator = RAGEvaluator()
    console.print(f"[bold yellow]Evaluating pipeline on {len(dataset)} examples...[/bold yellow]")
    
    with console.status("Running metrics..."):
        scores = evaluator.evaluate_pipeline(dataset, pipeline)
    
    table = Table(title="Evaluation Results")
    table.add_column("Metric", style="cyan")
    table.add_column("Score", style="bold green")
    
    for metric, score in scores.items():
        table.add_row(metric.replace("avg_", "").title(), f"{score:.4f}")
    
    console.print(table)

def cmd_clear_cache():
    cache = CacheManager()
    cache.clear_all()
    console.print("[bold green]Cache cleared successfully.[/bold green]")

def main():
    setup_logging()
    parser = argparse.ArgumentParser(description="Amen Bank RAG CLI")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Ingest
    ingest_parser = subparsers.add_parser("ingest", help="Ingest documents")
    ingest_parser.add_argument("--path", type=str, required=True, help="Path to file or directory")

    # Query
    query_parser = subparsers.add_parser("query", help="Query the RAG system")
    query_parser.add_argument("--question", type=str, required=True, help="Question to ask")

    # Evaluate
    eval_parser = subparsers.add_parser("evaluate", help="Evaluate the system")
    eval_parser.add_argument("--dataset", type=str, required=True, help="Path to JSON test dataset")

    # Clear cache
    subparsers.add_parser("clear-cache", help="Clear the response cache")

    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return

    # Initialize pipeline only for commands that need it
    if args.command in ["ingest", "query", "evaluate"]:
        pipeline = RAGPipeline()
    else:
        pipeline = None

    if args.command == "ingest":
        cmd_ingest(args, pipeline)
    elif args.command == "query":
        cmd_query(args, pipeline)
    elif args.command == "evaluate":
        cmd_evaluate(args, pipeline)
    elif args.command == "clear-cache":
        cmd_clear_cache()

if __name__ == "__main__":
    main()
