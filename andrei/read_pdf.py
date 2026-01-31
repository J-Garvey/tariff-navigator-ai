import pdfplumber
import os 

def process_pdf(pdf_path):
    extracted_data = ''

    with pdfplumber.open(pdf_path) as pdf:

        for page in pdf.pages:

            tables = page.extract_tables()

            if tables: 
                for i, table in enumerate(tables):
                    extracted_data += f"\n--- Table {i+1} ---\n"
                    for row in table:
            
                        clean_row = [cell if cell is not None else "" for cell in row]
                        extracted_data += " | ".join(clean_row) + "\n"
            
            # Extract text
            text = page.extract_text(layout=True)
            if text:
                extracted_data += f"\n--- Page Text ---\n{text}\n"
            
    return extracted_data

# Testing
def main(): 

    files_to_test = [
        "Altavita Safety Design Sheet(Product 1).pdf"
    ]
    
    # Store all combined results for the AI
    final_output = ""

    for file_name in files_to_test:
        if os.path.exists(file_name):
    
            # Run your extraction function
            content = process_pdf(file_name)
            
            # Format the output for the AI
            header = f"SOURCE FILE: {file_name} \n"
            final_output += header + content

        else:
            print(f"Error: {file_name} not found in the current directory.")
    
    with open("ai_input_debug.txt", "w", encoding="utf-8") as f:
        f.write(final_output)


if __name__ == '__main__':
    main() 