from rich.console import Console
from rich.table import Table

console = Console()


def info(msg):
    console.print(f"[blue]ℹ[/blue] {msg}")


def success(msg):
    console.print(f"[green]✓[/green] {msg}")


def warning(msg):
    console.print(f"[yellow]⚠[/yellow] {msg}")


def error(msg):
    console.print(f"[red]✗[/red] {msg}")


def print_table(title, columns, rows):
    table = Table(title=title, show_lines=True)
    for col in columns:
        table.add_column(col)
    for row in rows:
        table.add_row(*[str(v) for v in row])
    console.print(table)
