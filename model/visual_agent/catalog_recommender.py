
import pandas as pd
import numpy as np
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

neutral_colors = {"Black", "White", "Grey", "Beige"}

complementary_pairs = {
    "Red": {"Green"},
    "Green": {"Red"},
    "Blue": {"Orange"},
    "Orange": {"Blue"},
    "Yellow": {"Purple"},
    "Purple": {"Yellow"},
    "Pink": {"Green"},
    "Brown": {"Blue"},
}

BUCKET_COMPLEMENTS = {
    "TOPS": {"BOTTOMS","OUTERWEAR","ACCESSORIES"},
    "BOTTOMS": {"TOPS","OUTERWEAR","ACCESSORIES"},
    "OUTERWEAR": {"TOPS","BOTTOMS","ACCESSORIES"},
    "DRESSES": {"OUTERWEAR","ACCESSORIES","FOOTWEAR"},
    "FOOTWEAR": {"TOPS","BOTTOMS","DRESSES","ACCESSORIES"},
    "ACCESSORIES": {"TOPS","BOTTOMS","DRESSES","OUTERWEAR","FOOTWEAR"},
    "OTHER": {"TOPS","BOTTOMS","OUTERWEAR","ACCESSORIES","FOOTWEAR","DRESSES"}
}

def normalize_color(master, value):
    base = (master if isinstance(master, str) and master.strip() and master != "nan" else value) or ""
    s = str(base).lower()
    mappings = {
        r"navy|dark blue": "blue",
        r"blue": "blue",
        r"red|burgundy|maroon": "red",
        r"green|olive|khaki": "green",
        r"yellow|mustard|gold": "yellow",
        r"orange|rust": "orange",
        r"purple|violet|lilac": "purple",
        r"pink|fuchsia|magenta": "pink",
        r"brown|chocolate|camel|tan": "brown",
        r"beige|cream|ecru|sand": "beige",
        r"white|off white|ivory": "white",
        r"grey|gray|charcoal": "grey",
        r"black": "black"
    }
    for pattern, repl in mappings.items():
        if re.search(pattern, s):
            return repl.title()
    return s.title() if s else ""

def bucket_group(name):
    s = (name or "").lower()
    if re.search(r"jean|trouser|pant|short|skirt", s):
        return "BOTTOMS"
    if re.search(r"shirt|t-?shirt|tee|top|blouse|polo|sweater|hoodie|knit|cardigan|tank|camisole", s):
        return "TOPS"
    if re.search(r"jacket|coat|blazer|outer|parka|gilet|vest", s):
        return "OUTERWEAR"
    if re.search(r"dress|jumpsuit|overall", s):
        return "DRESSES"
    if re.search(r"bag|belt|scarf|cap|hat|beanie|glove|tie|sock", s):
        return "ACCESSORIES"
    if re.search(r"shoe|sneaker|boot|heel|sandal|loafer", s):
        return "FOOTWEAR"
    return "OTHER"

def color_score(a, b):
    if not a or not b:
        return 0.5
    if a == b:
        return 0.8
    if a in neutral_colors or b in neutral_colors:
        return 1.0
    if b in complementary_pairs.get(a, set()):
        return 0.9
    return 0.6

def graphic_pair_score(ga_a, ga_b):
    sa = (ga_a or "").lower()
    sb = (ga_b or "").lower()
    if not sa or not sb:
        return 0.5
    simple = {"solid", "plain"}
    patterned = {"patterned", "stripe", "striped", "dots", "print", "floral", "checked", "check"}
    in_simple_a = any(x in sa for x in simple)
    in_simple_b = any(x in sb for x in simple)
    in_patt_a = any(x in sa for x in patterned)
    in_patt_b = any(x in sb for x in patterned)
    if (in_simple_a and in_patt_b) or (in_simple_b and in_patt_a):
        return 0.8
    if sa == sb:
        return 0.6
    return 0.7

class CatalogRecommender:
    def __init__(self, df):
        self.df = df.copy()
        for c in ["prod_name","product_group_name","graphical_appearance_name",
                  "perceived_colour_value_name","perceived_colour_master_name",
                  "section_name","index_name","garment_group_name"]:
            if c in self.df.columns:
                self.df[c] = self.df[c].astype(str).str.strip()

        self.df["norm_color"] = self.df.apply(
            lambda r: normalize_color(
                r.get("perceived_colour_master_name",""),
                r.get("perceived_colour_value_name","")
            ),
            axis=1
        )
        self.df["bucket"] = self.df["garment_group_name"].apply(bucket_group) if "garment_group_name" in self.df.columns else "OTHER"

        names = self.df["prod_name"].fillna("").astype(str)
        self.vectorizer = TfidfVectorizer(min_df=2, ngram_range=(1,2))
        self.X = self.vectorizer.fit_transform(names)
        self.df["_row"] = np.arange(len(self.df))

    def _category_score(self, bucket_a, bucket_b, section_a, section_b, index_a, index_b):
        if bucket_a in BUCKET_COMPLEMENTS and bucket_b in BUCKET_COMPLEMENTS[bucket_a]:
            base = 1.0
        else:
            base = 0.5
        bonus = 0.0
        if pd.notna(section_a) and section_a == section_b:
            bonus += 0.1
        if pd.notna(index_a) and index_a == index_b:
            bonus += 0.1
        return min(1.0, base + bonus)

    def recommend_for(self, article_id, k=5, exclude_same_product_code=True):
        sub = self.df[self.df["article_id"] == article_id]
        if sub.empty:
            raise ValueError(f"article_id {article_id} not found")
        a = sub.iloc[0]
        i = int(a["_row"])

        sims = cosine_similarity(self.X[i], self.X).ravel()

        candidates = []
        for j, b in self.df.iterrows():
            if j == i:
                continue
            if exclude_same_product_code and "product_code" in self.df.columns:
                if b["product_code"] == a["product_code"]:
                    continue

            name_sim = float(sims[int(b["_row"])])

            cat = self._category_score(
                a.get("bucket"), b.get("bucket"),
                a.get("section_name"), b.get("section_name"),
                a.get("index_name"), b.get("index_name")
            )
            col = color_score(a.get("norm_color"), b.get("norm_color"))
            gfx = graphic_pair_score(a.get("graphical_appearance_name"), b.get("graphical_appearance_name"))

            total = (0.40 * cat) + (0.30 * name_sim) + (0.20 * col) + (0.10 * gfx)
            candidates.append({
                "article_id": b["article_id"],
                "prod_name": b.get("prod_name"),
                "score": total,
                "name_sim": name_sim,
                "category_score": cat,
                "color_score": col,
                "graphic_score": gfx,
                "bucket": b.get("bucket"),
                "norm_color": b.get("norm_color"),
                "garment_group_name": b.get("garment_group_name"),
            })

        recs = pd.DataFrame(candidates).sort_values("score", ascending=False).head(k).reset_index(drop=True)
        return recs

    def recommend_for_cart(self, article_ids, k=5, diversity=True):
        from sklearn.metrics.pairwise import cosine_similarity
        all_scores = {}
        id_to_row = {int(r["article_id"]): int(r["_row"]) for _, r in self.df.iterrows()}
        cart_ids = [aid for aid in article_ids if aid in id_to_row]

        for aid in cart_ids:
            cur = self.recommend_for(aid, k=max(k*3, 20))
            for _, r in cur.iterrows():
                all_scores.setdefault(int(r["article_id"]), []).append(r["score"])

        agg = []
        for cand_id, scores in all_scores.items():
            if cand_id in cart_ids:
                continue
            agg.append({"article_id": cand_id, "score": float(np.mean(scores))})

        recs = pd.DataFrame(agg).sort_values("score", ascending=False)

        if diversity and len(recs) > 0:
            merged = recs.merge(self.df[["article_id","product_code","bucket","prod_name"]], on="article_id", how="left")
            seen_codes = set()
            seen_buckets = set()
            final = []
            for _, r in merged.iterrows():
                code = r.get("product_code")
                buck = r.get("bucket")
                if code in seen_codes:
                    continue
                final.append(r)
                seen_codes.add(code)
                seen_buckets.add(buck)
                if len(final) >= k:
                    break
            recs_final = pd.DataFrame(final).reset_index(drop=True)
        else:
            recs_final = recs.head(k).merge(self.df[["article_id","product_code","bucket","prod_name"]], on="article_id", how="left")

        return recs_final.head(k)
