class ApiFeatures {
    constructor(query, queryStr) {
        this.query = query
        this.queryStr = queryStr
    }
    search() {
        const keyword = this.queryStr.keyword ? [
            { name: { $regex: this.queryStr.keyword, $options: "i" } },
            { category: { $regex: this.queryStr.keyword, $options: "i" } }
        ] : []
        if (this.queryStr.keyword) {
            this.query = this.query.find({ $or: keyword })
        } else {
            this.query = this.query.find()
        }
        return this
    }
    filter() {
        const querycpy = {...this.queryStr }

        const removeFields = ['keyword', 'page', 'limit'];
        removeFields.forEach(element => {
            delete querycpy[element]
        });
        // filter for price and reating
        let queryStr = JSON.stringify(querycpy);
        queryStr = queryStr.replace((/\b(gt|gte|lt|lte)\b/g), (key) => `$${key}`)
        this.query = this.query.find(JSON.parse(queryStr))
        return this;
    }
    pagination(resultPerPage) {
        const currentPage = Number(this.queryStr.page) || 1;
        const skip = resultPerPage * (currentPage - 1)
        this.query = this.query.limit(resultPerPage).skip(skip)
        return this
    }
}

module.exports = ApiFeatures