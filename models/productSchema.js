const mongoose = require("mongoose");
const slugify = require("slugify");
const { Schema } = mongoose;

const productSchema = new Schema(
    {
        productName: {
            type: String,
            required: true,
        },
        slug: {
            type: String,
            unique: true, 
        },
        description: {
            type: String,
            required: true,
        },
        brand: {
            type: String,
            required: true,
        },
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        regularPrice: {
            type: Number,
            required: true,
        },
        salePrice: {
            type: Number,
            required: true,
        },
        productOffer: {
            type: Number,
            default: 0,
        },
        quantity: {
            type: Number,
            required: true,
        },
        color: {
            type: String,
            required: true,
        },
        productImage: {
            type: [String],
            required: true,
        },
        isBlocked: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["Available", "Out of Stock", "Discontinued"],
            required: true,
            default: "Available",
        },
    },
    { timestamps: true }
);

productSchema.pre("save", async function (next) {
    if (!this.isModified("productName")) return next(); 

    let slug = slugify(this.productName, { lower: true, strict: true });

    let existingProduct = await mongoose.models.Product.findOne({ slug });
    let count = 1;
    while (existingProduct) {
        slug = `${slugify(this.productName, { lower: true, strict: true })}-${count}`;
        existingProduct = await mongoose.models.Product.findOne({ slug });
        count++;
    }
    this.slug = slug;
    next();
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
