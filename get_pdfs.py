import datetime
import os
import jinja2
import tempfile
from typing import Dict
import re

from pdf2image import convert_from_path
from playwright.sync_api import sync_playwright

CLASS1_URL = "https://www.halden.kommune.no/gimle-skole/tjenester/trinn/1-trinn/"
CLASS3_URL = "https://www.halden.kommune.no/gimle-skole/tjenester/trinn/3-trinn/"

OUT_PATH = os.getenv("OUT_PATH", ".")

def render_template(weekplans):
    context = {}
    context["title"] = "My Title"
    templateLoader = jinja2.FileSystemLoader(searchpath="./templates")
    templateEnv = jinja2.Environment(loader=templateLoader)
    TEMPLATE_FILE = "index.html"
    template = templateEnv.get_template(TEMPLATE_FILE)
    flat_list = []


    for kid in weekplans:
        for i,x in enumerate(kid["images"]):
            flat_list.append(dict(
                image=x,
                prefix=kid["prefix"],
                i=i,
                html_filename=f"{kid['prefix']}{i}.html" if len(flat_list) > 0 else "index.html"
                ))

    for i,image in enumerate(flat_list):
        context = {
            "image": image["image"],
            "prefix": image["prefix"],
            "i": image['i'],
            "next": flat_list[i+1]['html_filename'] if i < len(flat_list) - 1 else flat_list[0]['html_filename'],
            "prev": flat_list[i-1]['html_filename'],
        }
        print(context)
        with open(OUT_PATH + "/" + image['html_filename'], "w") as file:
            outputText = template.render(**context)
            file.write(outputText)


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
    with sync_playwright() as p:
        browser = p.webkit.launch()
        page = browser.new_page()
        page.goto(url)
        with page.expect_download() as download_info:
            page.get_by_text(re.compile(f"^uke {get_week()} ", re.IGNORECASE)).click()
        download = download_info.value

        extension = download.suggested_filename.split(".")[-1]

        filename = f"media/{prefix}{get_week()}.{extension}"
        if not is_downloaded(filename):
            download.save_as(f"{filename}")
        else:
            print(f"Already downloaded {filename}")

        browser.close()

    return {
        "filename": filename,
        "extension": extension,
        "prefix": prefix,
        "week": get_week(),
    }


def convert_pdf_to_images(weekplan: Dict):
    images = []
    with tempfile.TemporaryDirectory() as path:
        images_from_path = convert_from_path(weekplan["filename"], output_folder=path)
        for i, image in enumerate(images_from_path):
            image_path = (
                f"media/weekplan_{weekplan['week']}_{weekplan['prefix']}_{i}.png"
            )
            image.save(f"{OUT_PATH}/{image_path}", "PNG")
            print(f"Saved {image_path}")
            images.append(image_path)
    return images

def render_error(error_message):
    templateLoader = jinja2.FileSystemLoader(searchpath="./templates")
    templateEnv = jinja2.Environment(loader=templateLoader)
    template = templateEnv.get_template("error.html")
    
    with open(f"{OUT_PATH}/index.html", "w") as file:
        outputText = template.render(error_message=str(error_message), week=get_week())
        file.write(outputText)

if __name__ == "__main__":
    try:
        weekplans = [
            get_weekplan(CLASS3_URL, prefix="H"),
            get_weekplan(CLASS1_URL, prefix="A"),
        ]
        for weekplan in weekplans:
            weekplan["images"] = convert_pdf_to_images(weekplan)
            print(f"Converted {weekplan['filename']} to images: {weekplans}")

        render_template(weekplans)

    except Exception as e:
        print(e)
        render_error(e)
