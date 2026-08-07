from PIL import Image, ImageDraw

S = 180
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# rounded slate-900 tile
d.rounded_rectangle([0, 0, S - 1, S - 1], radius=40, fill="#0f172a")

# white chat bubble + tail
bubble = [50, 62, 144, 124]
d.rounded_rectangle(bubble, radius=18, fill="#ffffff")
d.polygon([(66, 124), (66, 150), (92, 124)], fill="#ffffff")

# emerald upward trend polyline
pts = [(62, 113), (88, 84), (110, 102), (130, 74)]
d.line(pts, fill="#10b981", width=13, joint="curve")

img.save("app/apple-icon.png")
print("saved", img.size)
