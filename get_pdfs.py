import logging
import datetime
import os
import jinja2
import tempfile
from typing import Dict
import re

from pdf2image import convert_from_path
from playwright.sync_api import sync_playwright

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

CLASS1_URL = "https://www.halden.kommune.no/gimle-skole/tjenester/trinn/2-trinn/"
CLASS3_URL = "https://www.halden.kommune.no/gimle-skole/tjenester/trinn/4-trinn/"

OUT_PATH = os.getenv("OUT_PATH", ".")

def render_template(weekplans):
    logging.info("Starting template rendering")
    context = {}
    context["title"] = "My Title"
    templateLoader = jinja2.FileSystemLoader(searchpath="./templates")
    templateEnv = jinja2.Environment(loader=templateLoader)
    TEMPLATE_FILE = "index.html"
    template = templateEnv.get_template(TEMPLATE_FILE)
    flat_list = []

    # Create comprehensive page data
    all_pages = {}  # Store all pages by prefix
    
    for kid in weekplans:
        logging.debug(f"Processing weekplan for prefix {kid['prefix']}")
        prefix = kid["prefix"]
        all_pages[prefix] = []
        
        for i,x in enumerate(kid["images"]):
            page_data = dict(
                image=x,
                prefix=prefix,
                i=i,
                html_filename=f"{prefix}{i}.html" if i > 0 else ("index.html" if prefix == "H" else f"{prefix}0.html"),
                week=kid["week"]
            )
            flat_list.append(page_data)
            all_pages[prefix].append(page_data)

    for i,image in enumerate(flat_list):
        logging.debug(f"Rendering template for image {i+1}/{len(flat_list)}")
        
        # Find pages for current prefix
        current_prefix_pages = all_pages[image["prefix"]]
        current_page_index = next(idx for idx, page in enumerate(current_prefix_pages) if page["i"] == image["i"])
        
        context = {
            "image": image["image"],
            "prefix": image["prefix"],
            "i": image['i'],
            "week": image["week"],
            "next": flat_list[i+1]['html_filename'] if i < len(flat_list) - 1 else flat_list[0]['html_filename'],
            "prev": flat_list[i-1]['html_filename'],
            "total_pages": len(current_prefix_pages),
            "current_page_num": current_page_index + 1,
            "all_pages": all_pages,
            "current_prefix_pages": current_prefix_pages
        }
        print(context)
        with open(OUT_PATH + "/" + image['html_filename'], "w") as file:
            outputText = template.render(**context)
            file.write(outputText)
    logging.info("Template rendering completed")

def is_downloaded(filename):
    return os.path.isfile(f"{filename}")


def get_week():
    weekday = datetime.datetime.now().isoweekday()
    if weekday <= 5:
        return datetime.datetime.now().isocalendar()[1]
    else:
        # Return next week after friday
        return datetime.datetime.now().isocalendar()[1] + 1


def get_weekplan(url, prefix):
    logging.info(f"Fetching weekplan for prefix {prefix} from {url}")
    with sync_playwright() as p:
        browser = p.webkit.launch()
        page = browser.new_page()
        page.goto(url)
        regex = re.compile(f"uke {get_week()}[^0-9]", re.IGNORECASE)
        logging.debug(f"Looking for week '{regex}' in {page.title()}")
        with page.expect_download() as download_info:
            page.get_by_text(regex).first.click()
        download = download_info.value

        extension = download.suggested_filename.split(".")[-1]

        filename = f"media/{prefix}{get_week()}.{extension}"
        if not is_downloaded(filename):
            logging.info(f"Downloading new file: {filename}")
            download.save_as(f"{filename}")
        else:
            logging.info(f"Using existing file: {filename}")

        browser.close()

    return {
        "filename": filename,
        "extension": extension,
        "prefix": prefix,
        "week": get_week(),
    }


def convert_pdf_to_images(weekplan: Dict):
    logging.info(f"Converting PDF to images for week {weekplan['week']} prefix {weekplan['prefix']}")
    images = []
    with tempfile.TemporaryDirectory() as path:
        images_from_path = convert_from_path(weekplan["filename"], output_folder=path)
        for i, image in enumerate(images_from_path):
            image_path = (
                f"media/weekplan_{weekplan['week']}_{weekplan['prefix']}_{i}.png"
            )
            image.save(f"{OUT_PATH}/{image_path}", "PNG")
            logging.debug(f"Saved image {i+1}/{len(images_from_path)}: {image_path}")
            print(f"Saved {image_path}")
            images.append(image_path)
    logging.info(f"Converted {len(images)} images")
    return images

def render_error(error_message):
    logging.error(f"Rendering error page: {error_message}")
    templateLoader = jinja2.FileSystemLoader(searchpath="./templates")
    templateEnv = jinja2.Environment(loader=templateLoader)
    template = templateEnv.get_template("error.html")
    
    with open(f"{OUT_PATH}/index.html", "w") as file:
        outputText = template.render(error_message=str(error_message), week=get_week())
        file.write(outputText)

if __name__ == "__main__":
    logging.info(f"Starting weekplan processing for week {get_week()}")
    try:
        weekplans = [
            get_weekplan(CLASS3_URL, prefix="H"),
            get_weekplan(CLASS1_URL, prefix="A"),
        ]
        for weekplan in weekplans:
            weekplan["images"] = convert_pdf_to_images(weekplan)
            logging.info(f"Processed weekplan: {weekplan['filename']}")

        render_template(weekplans)
        logging.info("Weekly plan processing completed successfully")

    except Exception as e:
        logging.exception("Error processing weekly plans")
        print(e)
        render_error(e)
        raise e
