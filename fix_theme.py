import os
import re

directory = 'frontend/src'

# Rules for replacing non-dark theme classes with light/dark combo
# We want to match things like:
# bg-zinc-900 -> bg-white dark:bg-zinc-900
# bg-zinc-800 -> bg-zinc-100 dark:bg-zinc-800
# bg-zinc-950 -> bg-zinc-50 dark:bg-zinc-950
# text-zinc-100 -> text-zinc-900 dark:text-zinc-100
# text-zinc-200 -> text-zinc-800 dark:text-zinc-200
# text-zinc-300 -> text-zinc-700 dark:text-zinc-300
# border-zinc-800 -> border-zinc-200 dark:border-zinc-800
# border-zinc-700 -> border-zinc-300 dark:border-zinc-700
# hover:bg-zinc-800 -> hover:bg-zinc-100 dark:hover:bg-zinc-800
# hover:bg-zinc-700 -> hover:bg-zinc-200 dark:hover:bg-zinc-700

# Careful not to replace already correct ones like dark:bg-zinc-900
replacements = {
    r'(?<!dark:)bg-zinc-900': 'bg-white dark:bg-zinc-900',
    r'(?<!dark:)(?<!hover:)bg-zinc-800': 'bg-zinc-100 dark:bg-zinc-800',
    r'(?<!dark:)(?<!hover:)bg-zinc-950': 'bg-zinc-50 dark:bg-zinc-950',
    r'(?<!dark:)text-zinc-100': 'text-zinc-900 dark:text-zinc-100',
    r'(?<!dark:)text-zinc-200': 'text-zinc-800 dark:text-zinc-200',
    r'(?<!dark:)text-zinc-300': 'text-zinc-700 dark:text-zinc-300',
    r'(?<!dark:)border-zinc-800': 'border-zinc-200 dark:border-zinc-800',
    r'(?<!dark:)(?<!hover:)border-zinc-700': 'border-zinc-300 dark:border-zinc-700',
    r'(?<!dark:)hover:bg-zinc-800': 'hover:bg-zinc-100 dark:hover:bg-zinc-800',
    r'(?<!dark:)hover:bg-zinc-700': 'hover:bg-zinc-200 dark:hover:bg-zinc-700',
    r'(?<!dark:)hover:border-zinc-700': 'hover:border-zinc-300 dark:hover:border-zinc-700',
    r'(?<!dark:)placeholder:text-zinc-600': 'placeholder:text-zinc-400 dark:placeholder:text-zinc-600',
    r'(?<!dark:)bg-zinc-900/50': 'bg-zinc-100/50 dark:bg-zinc-900/50',
    r'(?<!dark:)hover:bg-zinc-800/50': 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50',
    r'(?<!dark:)hover:text-zinc-100': 'hover:text-zinc-900 dark:hover:text-zinc-100',
}

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
            
            orig_content = content
            for pattern, repl in replacements.items():
                content = re.sub(pattern, repl, content)
            
            if content != orig_content:
                print(f"Updated {path}")
                with open(path, 'w') as f:
                    f.write(content)
